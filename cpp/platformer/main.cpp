#include <SDL2/SDL.h>
#include <emscripten/emscripten.h>
#include <vector>
#include <random>
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstring>

static constexpr int SW = 960;
static constexpr int SH = 720;
static constexpr int GROUND_Y = 640;
static constexpr int PW = 32;
static constexpr int PH = 32;
static constexpr float RISE_GRAVITY = 0.38f; // gravity while ascending (slower decel)
static constexpr float FALL_GRAVITY = 0.65f; // gravity while descending (faster fall)
static constexpr float JUMP_VEL = -8.0f;
static constexpr float BASE_SPEED = 2.0f;

static constexpr float MIN_GAP = PW * 2.0f;
static constexpr float MAX_GAP = PW * 7.0f;
static constexpr int SPIKE_W = 32;
static constexpr int SPIKE_H = 40;

enum class State
{
    WAITING,
    PLAYING,
    DEAD,
    COMPLETED
};

struct Player
{
    float x = 120.0f;
    float y = GROUND_Y - PH;
    float vy = 0.0f;
    bool ground = true;
    float jump_angle = 0.0f; // degrees, 0 = upright, accumulates during jump
};

struct Spike
{
    float x;
    float w = SPIKE_W;
    float h = SPIKE_H;
    float base_y = (float)GROUND_Y; // y-coordinate of spike base (top of surface)
};
struct Pit
{
    float x;
    float w;
};
struct Platform
{
    float x, y, w, h;
};
struct Star
{
    float x, y, brightness;
};

// Level object queue — sorted by worldX, consumed as scroll_x advances.
// worldX = total scroll distance at which this object spawns at the right edge.
enum class ObjType
{
    SPIKE,
    PIT,
    PLATFORM
};
struct LevelObj
{
    ObjType type;
    float worldX;
    float w = SPIKE_W; // pit width or platform width
    float h = 16.0f;   // platform thickness
    float wy = 100.0f; // pixels above GROUND_Y (platforms only)
};

struct Game
{
    SDL_Window *win = nullptr;
    SDL_Renderer *ren = nullptr;

    State state = State::WAITING;
    Player player;
    std::vector<Spike> spikes;
    std::vector<Pit> pits;
    std::vector<Platform> platforms;
    std::vector<Star> stars;

    bool level_mode = false;
    std::vector<LevelObj> pending_objs;
    size_t pending_idx = 0;
    float scroll_x = 0.0f;
    float level_finish_x = -1.0f; // scroll_x finish line for current level

    float speed = BASE_SPEED;
    float score = 0.0f;
    float gap_remain = (float)SW * 0.6f;

    std::mt19937 rng;
    std::uniform_real_distribution<float> gap_dist{MIN_GAP, MAX_GAP};
    std::uniform_real_distribution<float> star_x_d{0.0f, (float)SW};
    std::uniform_real_distribution<float> star_y_d{20.0f, (float)(GROUND_Y - 50)};
    std::uniform_real_distribution<float> star_b_d{0.3f, 1.0f};

    explicit Game() : rng(42)
    {
        for (int i = 0; i < 70; ++i)
            stars.push_back({star_x_d(rng), star_y_d(rng), star_b_d(rng)});
    }

    void reset()
    {
        rng.seed(SDL_GetTicks());
        player = Player{};
        spikes.clear();
        pits.clear();
        platforms.clear();
        speed = BASE_SPEED;
        score = 0.0f;
        gap_remain = (float)SW * 0.6f;
        scroll_x = 0.0f;
        pending_idx = 0;
        state = State::WAITING;
    }

    void trigger_jump()
    {
        switch (state)
        {
        case State::WAITING:
            state = State::PLAYING;
            return;
        case State::DEAD:
            reset();
            return;
        case State::COMPLETED:
            return;
        case State::PLAYING:
            if (player.ground)
            {
                player.vy = JUMP_VEL;
                player.ground = false;
            }
            break;
        }
    }
};

static Game *G = nullptr;

// Exported C API

extern "C"
{
    EMSCRIPTEN_KEEPALIVE int get_score() { return G ? (int)(G->score / 10.0f) : 0; }
    EMSCRIPTEN_KEEPALIVE int get_state() { return G ? (int)G->state : 0; }
    EMSCRIPTEN_KEEPALIVE void do_jump()
    {
        if (G)
            G->trigger_jump();
    }

    EMSCRIPTEN_KEEPALIVE void level_begin()
    {
        if (!G)
            return;
        G->pending_objs.clear();
        G->pending_idx = 0;
        G->level_mode = true;
    }

    EMSCRIPTEN_KEEPALIVE void level_add_spike(float worldX, float wy)
    {
        if (!G)
            return;
        LevelObj o;
        o.type = ObjType::SPIKE;
        o.worldX = worldX;
        o.wy = wy;
        G->pending_objs.push_back(o);
    }

    EMSCRIPTEN_KEEPALIVE void level_add_pit(float worldX, float width)
    {
        if (!G)
            return;
        LevelObj o;
        o.type = ObjType::PIT;
        o.worldX = worldX;
        o.w = width;
        G->pending_objs.push_back(o);
    }

    EMSCRIPTEN_KEEPALIVE void level_add_platform(float worldX, float wy, float width, float height)
    {
        if (!G)
            return;
        LevelObj o;
        o.type = ObjType::PLATFORM;
        o.worldX = worldX;
        o.w = width;
        o.h = height;
        o.wy = wy;
        G->pending_objs.push_back(o);
    }

    EMSCRIPTEN_KEEPALIVE void level_end()
    {
        if (!G)
            return;
        std::sort(G->pending_objs.begin(), G->pending_objs.end(),
                  [](const LevelObj &a, const LevelObj &b)
                  { return a.worldX < b.worldX; });
        G->pending_idx = 0;
        // Compute fallback finish line (overridden by level_set_finish if a finish tile was placed)
        float last_x = 0.0f;
        for (const auto &obj : G->pending_objs)
            last_x = std::max(last_x, obj.worldX);
        G->level_finish_x = last_x + 900.0f;
    }

    EMSCRIPTEN_KEEPALIVE void level_set_finish(float worldX)
    {
        if (!G)
            return;
        // worldX is the scroll distance at which the finish tile's LEFT edge enters
        // the right side of the screen. The player crosses it when scroll_x >= worldX.
        G->level_finish_x = worldX;
    }
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

static void draw_spike(SDL_Renderer *r, const Spike &s)
{
    float tip_x = s.x + s.w * 0.5f;
    float tip_y = s.base_y - s.h;
    SDL_SetRenderDrawColor(r, 215, 55, 55, 255);
    for (float y = tip_y; y <= s.base_y; y += 1.0f)
    {
        float t = (y - tip_y) / s.h;
        float half_w = t * s.w * 0.5f;
        SDL_RenderDrawLine(r, (int)(tip_x - half_w), (int)y, (int)(tip_x + half_w), (int)y);
    }
    SDL_SetRenderDrawColor(r, 140, 25, 25, 255);
    SDL_RenderDrawLine(r, (int)s.x, (int)s.base_y, (int)tip_x, (int)tip_y);
    SDL_RenderDrawLine(r, (int)(s.x + s.w), (int)s.base_y, (int)tip_x, (int)tip_y);
}

static void draw_digit(SDL_Renderer *r, int d, int x, int y, int w, int h)
{
    static const bool S[10][7] = {
        {1, 1, 1, 0, 1, 1, 1},
        {0, 0, 1, 0, 0, 1, 0},
        {1, 0, 1, 1, 1, 0, 1},
        {1, 0, 1, 1, 0, 1, 1},
        {0, 1, 1, 1, 0, 1, 0},
        {1, 1, 0, 1, 0, 1, 1},
        {1, 1, 0, 1, 1, 1, 1},
        {1, 0, 1, 0, 0, 1, 0},
        {1, 1, 1, 1, 1, 1, 1},
        {1, 1, 1, 1, 0, 1, 1},
    };
    if (d < 0 || d > 9)
        return;
    const bool *s = S[d];
    const int t = 3, hh = h / 2;
    auto fill = [&](SDL_Rect rc)
    { SDL_RenderFillRect(r, &rc); };
    if (s[0])
        fill({x, y, w, t});
    if (s[1])
        fill({x, y, t, hh});
    if (s[2])
        fill({x + w - t, y, t, hh});
    if (s[3])
        fill({x, y + hh, w, t});
    if (s[4])
        fill({x, y + hh, t, hh});
    if (s[5])
        fill({x + w - t, y + hh, t, hh});
    if (s[6])
        fill({x, y + h - t, w, t});
}

static void draw_score(SDL_Renderer *r, int score)
{
    SDL_SetRenderDrawColor(r, 255, 215, 70, 255);
    char buf[12];
    std::snprintf(buf, sizeof(buf), "%d", score);
    const int dw = 18, dh = 32, gap = 4;
    int total_w = (int)std::strlen(buf) * (dw + gap) - gap;
    int sx = SW - total_w - 16, sy = 14;
    for (int i = 0; buf[i]; ++i)
        draw_digit(r, buf[i] - '0', sx + i * (dw + gap), sy, dw, dh);
}

static void draw_prompt(SDL_Renderer *r, Uint32 ticks)
{
    float pulse = 0.5f + 0.5f * std::sin((float)ticks / 400.0f);
    Uint8 alpha = (Uint8)(180 + 75 * pulse);
    SDL_SetRenderDrawBlendMode(r, SDL_BLENDMODE_BLEND);
    SDL_SetRenderDrawColor(r, 255, 215, 70, alpha);
    int cx = SW / 2, cy = SH / 2 + 20;
    for (int i = 0; i < 12; ++i)
        SDL_RenderDrawLine(r, cx - 12 + i, cy - i, cx - 12 + i, cy + i);
    SDL_Rect bar = {cx - 70, cy + 20, 140, 4};
    SDL_RenderFillRect(r, &bar);
    SDL_SetRenderDrawBlendMode(r, SDL_BLENDMODE_NONE);
}

// ─── Spike collision (triangle with 4px forgiveness margin) ──────────────────

static bool collides(const Player &p, const Spike &s)
{
    for (int row = 0; row < PH; row += 2)
    {
        int test_y = (int)p.y + row;
        float tip_y = s.base_y - s.h;
        if ((float)test_y < tip_y)
            continue;
        if ((float)test_y >= s.base_y)
            break;
        float frac = ((float)test_y - tip_y) / s.h;
        float half_w = frac * s.w * 0.5f - 4.0f;
        if (half_w <= 0.0f)
            continue;
        float tip_x = s.x + s.w * 0.5f;
        if ((p.x + (float)PW) > tip_x - half_w && p.x < tip_x + half_w)
            return true;
    }
    return false;
}

// ─── Main loop ────────────────────────────────────────────────────────────────

static void loop()
{
    SDL_Event e;
    while (SDL_PollEvent(&e))
    {
        if (e.type == SDL_QUIT)
        {
            emscripten_cancel_main_loop();
            return;
        }
        if (e.type == SDL_KEYDOWN)
        {
            auto sym = e.key.keysym.sym;
            if (sym == SDLK_SPACE || sym == SDLK_UP || sym == SDLK_w || sym == SDLK_RETURN)
                G->trigger_jump();
        }
        if (e.type == SDL_MOUSEBUTTONDOWN || e.type == SDL_FINGERDOWN)
            G->trigger_jump();
    }

    if (G->state == State::PLAYING)
    {
        float spd = G->speed;

        G->player.vy += (G->player.vy < 0.0f ? RISE_GRAVITY : FALL_GRAVITY);
        G->player.y += G->player.vy;

        // Accumulate rotation while airborne
        if (!G->player.ground)
            G->player.jump_angle += 4.9f; // ~37 frames per jump → ~180°

        for (auto &s : G->spikes)
            s.x -= spd;
        for (auto &p : G->pits)
            p.x -= spd;
        for (auto &p : G->platforms)
            p.x -= spd;
        G->scroll_x += spd;

        // Object spawning
        if (G->level_mode)
        {
            while (G->pending_idx < G->pending_objs.size() &&
                   G->pending_objs[G->pending_idx].worldX <= G->scroll_x)
            {
                const auto &obj = G->pending_objs[G->pending_idx++];
                switch (obj.type)
                {
                case ObjType::SPIKE:
                {
                    Spike s;
                    s.x = (float)SW + 4;
                    s.base_y = (float)GROUND_Y - obj.wy;
                    G->spikes.push_back(s);
                    break;
                }
                case ObjType::PIT:
                {
                    Pit p;
                    p.x = (float)SW;
                    p.w = obj.w;
                    G->pits.push_back(p);
                    break;
                }
                case ObjType::PLATFORM:
                {
                    Platform p;
                    p.x = (float)SW + 4;
                    p.y = (float)GROUND_Y - obj.wy - obj.h;
                    p.w = obj.w;
                    p.h = obj.h;
                    G->platforms.push_back(p);
                    break;
                }
                }
            }
        }
        else
        {
            G->gap_remain -= spd;
            if (G->gap_remain <= 0.0f)
            {
                Spike ns;
                ns.x = (float)SW + 8.0f;
                G->spikes.push_back(ns);
                G->gap_remain = (float)SPIKE_W + G->gap_dist(G->rng);
            }
        }

        G->spikes.erase(std::remove_if(G->spikes.begin(), G->spikes.end(),
                                       [](const Spike &s)
                                       { return s.x + s.w < 0.0f; }),
                        G->spikes.end());
        G->pits.erase(std::remove_if(G->pits.begin(), G->pits.end(),
                                     [](const Pit &p)
                                     { return p.x + p.w < 0.0f; }),
                      G->pits.end());
        G->platforms.erase(std::remove_if(G->platforms.begin(), G->platforms.end(),
                                          [](const Platform &p)
                                          { return p.x + p.w < 0.0f; }),
                           G->platforms.end());

        // Platform landing (must check before floor so elevated player isn't snapped down)
        bool on_platform = false;
        for (auto &plat : G->platforms)
        {
            if (G->player.vy >= 0.0f &&
                G->player.x + (float)PW > plat.x &&
                G->player.x < plat.x + plat.w &&
                G->player.y + (float)PH >= plat.y &&
                G->player.y + (float)PH < plat.y + plat.h + 8.0f)
            {
                G->player.y = plat.y - (float)PH;
                G->player.vy = 0.0f;
                G->player.ground = true;
                G->player.jump_angle = 0.0f; // snap upright on landing
                on_platform = true;
                break;
            }
        }

        if (!on_platform)
        {
            // Pit detection: use center-X with small inset so edges are forgiving
            bool over_pit = false;
            float pcx = G->player.x + (float)PW * 0.5f;
            for (const auto &pit : G->pits)
            {
                if (pcx > pit.x + 4.0f && pcx < pit.x + pit.w - 4.0f)
                {
                    over_pit = true;
                    break;
                }
            }

            if (over_pit)
            {
                if (G->player.y > (float)SH)
                    G->state = State::DEAD;
            }
            else
            {
                float floor_y = (float)(GROUND_Y - PH);
                if (G->player.y >= floor_y)
                {
                    G->player.y = floor_y;
                    G->player.vy = 0.0f;
                    G->player.ground = true;
                    G->player.jump_angle = 0.0f; // snap upright on landing
                }
            }
        }

        // Platform left-wall collision — player running into the face of a platform is fatal
        for (const auto &plat : G->platforms)
        {
            // Horizontal overlap: player right edge past platform left edge
            bool x_hit = G->player.x + (float)PW > plat.x &&
                         G->player.x < plat.x + plat.w;
            // Vertical overlap: player box overlaps platform box (not just the surface)
            bool y_hit = G->player.y + (float)PH > plat.y &&
                         G->player.y < plat.y + plat.h;
            // Only fatal when approaching from the left (platform left edge inside player)
            // and the player is not currently sitting on top of this platform
            bool on_top = G->player.y + (float)PH <= plat.y + 2.0f;
            if (x_hit && y_hit && !on_top && G->player.x + (float)PW > plat.x && G->player.x < plat.x)
            {
                G->state = State::DEAD;
                break;
            }
        }

        for (const auto &s : G->spikes)
        {
            if (collides(G->player, s))
            {
                G->state = State::DEAD;
                break;
            }
        }

        G->score += spd;
        // Speed is constant — no acceleration

        // Level completion: player scrolled past the finish line
        if (G->level_mode && G->level_finish_x > 0.0f && G->scroll_x >= G->level_finish_x)
            G->state = State::COMPLETED;
    }

    float star_spd = (G->state == State::PLAYING) ? G->speed * 0.25f : BASE_SPEED * 0.25f;
    for (auto &st : G->stars)
    {
        st.x -= star_spd;
        if (st.x < 0.0f)
            st.x += (float)SW;
    }

    // ── Render ──
    SDL_Renderer *r = G->ren;
    Uint32 ticks = SDL_GetTicks();

    SDL_SetRenderDrawColor(r, 10, 10, 25, 255);
    SDL_RenderClear(r);

    for (const auto &st : G->stars)
    {
        Uint8 b = (Uint8)(st.brightness * 210);
        SDL_SetRenderDrawColor(r, b, b, (Uint8)std::min(255, b + 30), 255);
        SDL_RenderDrawPoint(r, (int)st.x, (int)st.y);
        SDL_RenderDrawPoint(r, (int)st.x + 1, (int)st.y);
    }

    // Platforms (drawn before ground so ground edge sits above them)
    for (const auto &p : G->platforms)
    {
        if (p.x + p.w < 0 || p.x > SW)
            continue;
        SDL_SetRenderDrawColor(r, 58, 110, 160, 255);
        SDL_Rect pr = {(int)p.x, (int)p.y, (int)p.w, (int)p.h};
        SDL_RenderFillRect(r, &pr);
        SDL_SetRenderDrawColor(r, 120, 180, 255, 255);
        SDL_RenderDrawLine(r, (int)p.x, (int)p.y, (int)(p.x + p.w), (int)p.y);
        SDL_SetRenderDrawColor(r, 30, 70, 110, 255);
        SDL_RenderDrawLine(r, (int)p.x, (int)p.y, (int)p.x, (int)(p.y + p.h));
    }

    // Ground fill
    SDL_SetRenderDrawColor(r, 42, 42, 68, 255);
    SDL_Rect gfill = {0, GROUND_Y, SW, SH - GROUND_Y};
    SDL_RenderFillRect(r, &gfill);

    // Pit cutouts over ground fill
    for (const auto &pit : G->pits)
    {
        int px = (int)std::max(0.0f, pit.x);
        int pr = (int)std::min((float)SW, pit.x + pit.w);
        if (pr <= px)
            continue;
        SDL_SetRenderDrawColor(r, 8, 8, 20, 255);
        SDL_Rect pr2 = {px, GROUND_Y, pr - px, SH - GROUND_Y};
        SDL_RenderFillRect(r, &pr2);
        SDL_SetRenderDrawColor(r, 18, 12, 32, 255);
        SDL_Rect depth = {px, SH - 14, pr - px, 14};
        SDL_RenderFillRect(r, &depth);
    }

    // Ground surface line
    SDL_SetRenderDrawColor(r, 95, 95, 150, 255);
    SDL_RenderDrawLine(r, 0, GROUND_Y, SW, GROUND_Y);
    for (const auto &pit : G->pits)
    {
        int px = (int)std::max(0.0f, pit.x);
        int pr = (int)std::min((float)SW, pit.x + pit.w);
        if (pr <= px)
            continue;
        SDL_SetRenderDrawColor(r, 8, 8, 20, 255);
        SDL_RenderDrawLine(r, px, GROUND_Y, pr, GROUND_Y);
        SDL_SetRenderDrawColor(r, 95, 95, 150, 255);
        if (pit.x > 0 && pit.x < SW)
            SDL_RenderDrawLine(r, px, GROUND_Y - 7, px, GROUND_Y);
        if (pit.x + pit.w > 0 && pit.x + pit.w < SW)
            SDL_RenderDrawLine(r, pr, GROUND_Y - 7, pr, GROUND_Y);
    }

    for (const auto &s : G->spikes)
        draw_spike(r, s);

    {
        // Draw player as a rotation-animated cube
        float cx = G->player.x + PW * 0.5f;
        float cy = G->player.y + PH * 0.5f;
        float angle_rad = G->player.jump_angle * (float)M_PI / 180.0f;
        float ca = std::cos(angle_rad), sa = std::sin(angle_rad);
        float hw = PW * 0.5f, hh = PH * 0.5f;

        // Compute 4 rotated corners (top-left, top-right, bottom-right, bottom-left)
        struct Pt
        {
            float x, y;
        };
        Pt corners[4] = {
            {cx + (-hw) * ca - (-hh) * sa, cy + (-hw) * sa + (-hh) * ca},
            {cx + hw * ca - (-hh) * sa, cy + hw * sa + (-hh) * ca},
            {cx + hw * ca - hh * sa, cy + hw * sa + hh * ca},
            {cx + (-hw) * ca - hh * sa, cy + (-hw) * sa + hh * ca},
        };

        // Scanline fill — body
        float min_y = corners[0].y, max_y = corners[0].y;
        for (int i = 1; i < 4; i++)
        {
            min_y = std::min(min_y, corners[i].y);
            max_y = std::max(max_y, corners[i].y);
        }
        SDL_SetRenderDrawColor(r, 255, 195, 0, 255);
        for (int y = (int)min_y; y <= (int)max_y; y++)
        {
            float xl = 1e9f, xr = -1e9f;
            for (int i = 0; i < 4; i++)
            {
                const Pt &a = corners[i], &b = corners[(i + 1) % 4];
                if ((a.y <= (float)y && b.y > (float)y) || (b.y <= (float)y && a.y > (float)y))
                {
                    float t = ((float)y - a.y) / (b.y - a.y);
                    float x = a.x + t * (b.x - a.x);
                    xl = std::min(xl, x);
                    xr = std::max(xr, x);
                }
            }
            if (xl < xr)
                SDL_RenderDrawLine(r, (int)xl, y, (int)xr, y);
        }

        // Highlight dot — rotated with the cube, offset toward top-left corner
        float hx = cx + (-hw * 0.35f) * ca - (-hh * 0.35f) * sa;
        float hy = cy + (-hw * 0.35f) * sa + (-hh * 0.35f) * ca;
        SDL_SetRenderDrawColor(r, 255, 235, 110, 255);
        SDL_Rect hi = {(int)(hx - 4), (int)(hy - 4), 8, 8};
        SDL_RenderFillRect(r, &hi);

        // Shadow edge — bottom edge of rotated cube
        SDL_SetRenderDrawColor(r, 200, 140, 0, 255);
        for (int i = 0; i < 4; i++)
        {
            const Pt &a = corners[i], &b = corners[(i + 1) % 4];
            // Draw only bottom-facing edges (normal points downward)
            float nx = -(b.y - a.y), ny = b.x - a.x; // outward normal
            if (ny > 0)
                SDL_RenderDrawLine(r, (int)a.x, (int)a.y, (int)b.x, (int)b.y);
        }
    }

    draw_score(r, get_score());

    if (G->state != State::PLAYING)
    {
        SDL_SetRenderDrawBlendMode(r, SDL_BLENDMODE_BLEND);
        SDL_SetRenderDrawColor(r, 0, 0, 0, 140);
        SDL_Rect overlay = {0, 0, SW, SH};
        SDL_RenderFillRect(r, &overlay);
        SDL_SetRenderDrawBlendMode(r, SDL_BLENDMODE_NONE);
        draw_prompt(r, ticks);
    }

    SDL_RenderPresent(r);
}

int main()
{
    SDL_Init(SDL_INIT_VIDEO | SDL_INIT_EVENTS);
    SDL_Window *win = SDL_CreateWindow(
        "Platform Rush", SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED, SW, SH, 0);
    SDL_Renderer *ren = SDL_CreateRenderer(
        win, -1, SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC);

    G = new Game();
    G->win = win;
    G->ren = ren;

    emscripten_set_main_loop(loop, 0, 1);

    delete G;
    SDL_DestroyRenderer(ren);
    SDL_DestroyWindow(win);
    SDL_Quit();
    return 0;
}
