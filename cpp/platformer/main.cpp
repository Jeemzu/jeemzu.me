#include <SDL2/SDL.h>
#include <emscripten/emscripten.h>
#include <vector>
#include <random>
#include <algorithm>
#include <cmath>

static constexpr int SW = 960;
static constexpr int SH = 720;
static constexpr int GROUND_Y = 640;
static constexpr int PW = 32;
static constexpr int PH = 32;
static constexpr float RISE_GRAVITY = 0.11f; // gravity while ascending — wide arc, same height
static constexpr float FALL_GRAVITY = 0.50f; // gravity while descending
static constexpr float JUMP_VEL = -5.5f;
static constexpr float BASE_SPEED = 1.5f;
static constexpr double STEP_MS = 1000.0 / 60.0; // physics was tuned per 60 Hz frame
static constexpr int JUMP_BUFFER_STEPS = 6;

static constexpr float MIN_GAP = PW * 2.0f;
static constexpr float MAX_GAP = PW * 7.0f;
static constexpr int SPIKE_W = 32;
static constexpr int SPIKE_H = 40;

// Host events drained by JS each frame (sound cues, state changes).
static constexpr int EV_JUMP = 1;
static constexpr int EV_LAND = 2;
static constexpr int EV_DEATH = 4;
static constexpr int EV_COMPLETE = 8;

// ─── Starfield-noir palette ──────────────────────────────────────────────────

struct Rgba
{
    Uint8 r, g, b, a;
    constexpr Rgba alpha(Uint8 na) const { return {r, g, b, na}; }
};

namespace pal
{
    constexpr Rgba SKY_TOP{4, 6, 18, 255};
    constexpr Rgba SKY_HORIZON{22, 28, 66, 255};
    constexpr Rgba RIDGE_FAR{16, 21, 50, 255};
    constexpr Rgba RIDGE_NEAR{10, 13, 34, 255};
    constexpr Rgba GROUND_TOP{20, 26, 58, 255};
    constexpr Rgba GROUND_BOTTOM{7, 9, 22, 255};
    constexpr Rgba GROUND_TICK{120, 140, 220, 22};
    constexpr Rgba PIT_TOP{2, 3, 10, 255};
    constexpr Rgba PIT_BOTTOM{0, 0, 0, 255};
    constexpr Rgba GOLD{255, 204, 80, 255};
    constexpr Rgba GOLD_DEEP{206, 140, 24, 255};
    constexpr Rgba GOLD_LIGHT{255, 242, 190, 255};
    constexpr Rgba STAR{214, 222, 255, 255};
    constexpr Rgba STAR_WARM{255, 226, 160, 255};
    constexpr Rgba SPIKE_BASE{138, 18, 42, 255};
    constexpr Rgba SPIKE_TIP{255, 104, 104, 255};
    constexpr Rgba SPIKE_SHADE{84, 8, 28, 255};
    constexpr Rgba SPIKE_GLOW{255, 60, 90, 70};
    constexpr Rgba PLATFORM_TOP{40, 54, 110, 255};
    constexpr Rgba PLATFORM_BOTTOM{16, 22, 52, 255};
}

enum class State
{
    WAITING,
    PLAYING,
    DEAD,
    COMPLETED
};

enum class JumpState
{
    GROUNDED,
    RISING,
    FALLING
};

struct Player
{
    float x = 120.0f;
    float y = GROUND_Y - PH;
    float vy = 0.0f;
    bool ground = true;
    float jump_angle = 0.0f; // degrees, 0 = upright, accumulates during jump
    JumpState jump_state = JumpState::GROUNDED;
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
    float x, y, size, brightness, phase;
    bool warm;
};
struct StarLayer
{
    float parallax;
    std::vector<Star> stars;
};
struct Particle
{
    float x, y, vx, vy, life, max_life, size, spin, angle;
    Rgba color;
};
struct TrailPoint
{
    float x, y, angle;
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
    std::vector<StarLayer> star_layers;
    std::vector<Particle> particles;
    std::vector<TrailPoint> trail;

    bool level_mode = false;
    std::vector<LevelObj> pending_objs;
    size_t pending_idx = 0;
    float scroll_x = 0.0f;
    float bg_x = 0.0f;
    float level_finish_x = -1.0f; // scroll_x finish line for current level

    float speed = BASE_SPEED;
    float score = 0.0f;
    float gap_remain = (float)SW * 0.6f;

    bool jump_held = false;
    int jump_buffer = 0;
    int events = 0;
    double last_ms = 0.0;
    double acc_ms = 0.0;

    std::mt19937 rng;
    std::uniform_real_distribution<float> gap_dist{MIN_GAP, MAX_GAP};
    std::uniform_real_distribution<float> unit{0.0f, 1.0f};

    explicit Game() : rng(42)
    {
        // Far → near: more, smaller, slower stars in the back.
        const struct
        {
            float parallax;
            int count;
            float min_size, max_size;
        } layers[] = {{0.06f, 110, 1.0f, 1.6f}, {0.16f, 55, 1.6f, 2.4f}, {0.34f, 22, 2.4f, 3.4f}};
        for (const auto &l : layers)
        {
            StarLayer layer{l.parallax, {}};
            for (int i = 0; i < l.count; ++i)
                layer.stars.push_back({unit(rng) * SW, 14.0f + unit(rng) * (GROUND_Y - 120.0f),
                                       l.min_size + unit(rng) * (l.max_size - l.min_size),
                                       0.35f + unit(rng) * 0.65f, unit(rng) * 6.283f, unit(rng) < 0.18f});
            star_layers.push_back(std::move(layer));
        }
    }

    void reset()
    {
        rng.seed(SDL_GetTicks());
        player = Player{};
        spikes.clear();
        pits.clear();
        platforms.clear();
        particles.clear();
        trail.clear();
        speed = BASE_SPEED;
        score = 0.0f;
        gap_remain = (float)SW * 0.6f;
        scroll_x = 0.0f;
        pending_idx = 0;
        jump_buffer = 0;
        state = State::WAITING;
    }

    void burst(float cx, float cy, int count, float speed_min, float speed_max, float life, Rgba color, float size)
    {
        for (int i = 0; i < count; ++i)
        {
            float a = unit(rng) * 6.283f;
            float s = speed_min + unit(rng) * (speed_max - speed_min);
            float l = life * (0.6f + unit(rng) * 0.4f);
            particles.push_back({cx, cy, std::cos(a) * s, std::sin(a) * s - 1.2f, l, l,
                                 size * (0.6f + unit(rng) * 0.8f), (unit(rng) - 0.5f) * 0.4f, unit(rng) * 6.283f, color});
        }
    }

    void die()
    {
        state = State::DEAD;
        events |= EV_DEATH;
        burst(player.x + PW * 0.5f, player.y + PH * 0.5f, 34, 1.5f, 6.0f, 55.0f, pal::GOLD, 5.0f);
        burst(player.x + PW * 0.5f, player.y + PH * 0.5f, 14, 0.5f, 3.0f, 70.0f, pal::GOLD_LIGHT, 3.0f);
    }
};

static Game *G = nullptr;

// ─── Geometry batching ───────────────────────────────────────────────────────
// Everything is drawn as float triangles so edges stay sharp at any backing resolution.

struct Batch
{
    std::vector<SDL_Vertex> v;

    void vert(float x, float y, Rgba c)
    {
        v.push_back({{x, y}, {c.r, c.g, c.b, c.a}, {0.0f, 0.0f}});
    }
    void tri(float x1, float y1, Rgba c1, float x2, float y2, Rgba c2, float x3, float y3, Rgba c3)
    {
        vert(x1, y1, c1);
        vert(x2, y2, c2);
        vert(x3, y3, c3);
    }
    void quad4(const SDL_FPoint p[4], Rgba c0, Rgba c1, Rgba c2, Rgba c3)
    {
        tri(p[0].x, p[0].y, c0, p[1].x, p[1].y, c1, p[2].x, p[2].y, c2);
        tri(p[0].x, p[0].y, c0, p[2].x, p[2].y, c2, p[3].x, p[3].y, c3);
    }
    void rect(float x, float y, float w, float h, Rgba top, Rgba bottom)
    {
        const SDL_FPoint p[4] = {{x, y}, {x + w, y}, {x + w, y + h}, {x, y + h}};
        quad4(p, top, top, bottom, bottom);
    }
    void rect(float x, float y, float w, float h, Rgba c) { rect(x, y, w, h, c, c); }
    void rect_h(float x, float y, float w, float h, Rgba left, Rgba right)
    {
        const SDL_FPoint p[4] = {{x, y}, {x + w, y}, {x + w, y + h}, {x, y + h}};
        quad4(p, left, right, right, left);
    }
    // Square of half-size `half` centred on (cx, cy), rotated by `rad`.
    void square(float cx, float cy, float half, float rad, Rgba c0, Rgba c1, Rgba c2, Rgba c3)
    {
        float ca = std::cos(rad), sa = std::sin(rad);
        const float ox[4] = {-half, half, half, -half};
        const float oy[4] = {-half, -half, half, half};
        SDL_FPoint p[4];
        for (int i = 0; i < 4; ++i)
            p[i] = {cx + ox[i] * ca - oy[i] * sa, cy + ox[i] * sa + oy[i] * ca};
        quad4(p, c0, c1, c2, c3);
    }
    void square(float cx, float cy, float half, float rad, Rgba c) { square(cx, cy, half, rad, c, c, c, c); }

    void flush(SDL_Renderer *r, SDL_BlendMode mode)
    {
        if (v.empty())
            return;
        SDL_SetRenderDrawBlendMode(r, mode);
        SDL_RenderGeometry(r, nullptr, v.data(), (int)v.size(), nullptr, 0);
        v.clear();
    }
};

static Batch B;

// ─── Exported C API ──────────────────────────────────────────────────────────

extern "C"
{
    EMSCRIPTEN_KEEPALIVE int get_score() { return G ? (int)(G->score / 10.0f) : 0; }
    EMSCRIPTEN_KEEPALIVE int get_state() { return G ? (int)G->state : 0; }

    /** Level progress in thousandths (0–1000); 0 outside level mode. */
    EMSCRIPTEN_KEEPALIVE int get_progress()
    {
        if (!G || !G->level_mode || G->level_finish_x <= 0.0f)
            return 0;
        return (int)(std::min(1.0f, G->scroll_x / G->level_finish_x) * 1000.0f);
    }

    EMSCRIPTEN_KEEPALIVE int take_events()
    {
        if (!G)
            return 0;
        int e = G->events;
        G->events = 0;
        return e;
    }

    EMSCRIPTEN_KEEPALIVE void do_jump()
    {
        if (G && G->state == State::PLAYING)
            G->jump_buffer = JUMP_BUFFER_STEPS;
    }

    EMSCRIPTEN_KEEPALIVE void set_jump_held(int held)
    {
        if (G)
            G->jump_held = held != 0;
    }

    EMSCRIPTEN_KEEPALIVE void start_run()
    {
        if (!G)
            return;
        G->reset();
        G->state = State::PLAYING;
        G->events = 0;
        G->acc_ms = 0.0;
        G->last_ms = emscripten_get_now();
    }

    /** Resizes the drawing buffer to device pixels; drawing stays in SW×SH logical units. */
    EMSCRIPTEN_KEEPALIVE void set_viewport(int width, int height)
    {
        if (!G || width <= 0 || height <= 0)
            return;
        SDL_SetWindowSize(G->win, width, height);
        SDL_RenderSetLogicalSize(G->ren, SW, SH);
    }

    EMSCRIPTEN_KEEPALIVE void set_paused(int paused)
    {
        if (!G)
            return;
        if (paused)
            emscripten_pause_main_loop();
        else
        {
            G->last_ms = emscripten_get_now();
            G->acc_ms = 0.0;
            emscripten_resume_main_loop();
        }
    }

    EMSCRIPTEN_KEEPALIVE void shutdown()
    {
        if (!G)
            return;
        emscripten_cancel_main_loop();
        SDL_DestroyRenderer(G->ren);
        SDL_DestroyWindow(G->win);
        SDL_Quit();
        delete G;
        G = nullptr;
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
        // worldX = col * TILE: the scroll_x at which the tile spawns at the right edge.
        // The player (fixed at screen x=120) actually reaches it SW-120 = 840px later.
        G->level_finish_x = worldX + ((float)SW - 120.0f);
    }
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

// ─── Simulation (one 60 Hz step) ──────────────────────────────────────────────

static void step_particles()
{
    for (auto &p : G->particles)
    {
        p.vy += 0.18f;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985f;
        p.angle += p.spin;
        p.life -= 1.0f;
        if (p.y > GROUND_Y - 2.0f && p.vy > 0.0f)
        {
            p.y = GROUND_Y - 2.0f;
            p.vy *= -0.35f;
            p.vx *= 0.7f;
        }
    }
    G->particles.erase(std::remove_if(G->particles.begin(), G->particles.end(),
                                      [](const Particle &p)
                                      { return p.life <= 0.0f; }),
                       G->particles.end());
}

static void step_game()
{
    float spd = G->speed;
    Player &pl = G->player;
    JumpState prev_jump = pl.jump_state;

    if (pl.ground && (G->jump_held || G->jump_buffer > 0))
    {
        pl.vy = JUMP_VEL;
        pl.ground = false;
        pl.jump_state = JumpState::RISING;
        G->jump_buffer = 0;
        G->events |= EV_JUMP;
    }
    else if (G->jump_buffer > 0)
        --G->jump_buffer;

    // Explicit jump state machine: RISING → FALLING at apex, FALLING → GROUNDED on land
    if (pl.jump_state == JumpState::RISING && pl.vy >= 0.0f)
        pl.jump_state = JumpState::FALLING;

    float grav = (pl.jump_state == JumpState::RISING) ? RISE_GRAVITY : FALL_GRAVITY;
    pl.vy += grav;
    pl.y += pl.vy;

    // Accumulate rotation while airborne
    if (!pl.ground)
        pl.jump_angle += 4.8f; // ~75 frames per jump → 360° (one full rotation)

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
                p.y = (float)GROUND_Y - obj.wy;
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
        if (pl.vy >= 0.0f &&
            pl.y < plat.y && // must be approaching from above, not running into the face
            pl.x + (float)PW > plat.x &&
            pl.x < plat.x + plat.w &&
            pl.y + (float)PH >= plat.y &&
            pl.y + (float)PH < plat.y + plat.h + 8.0f)
        {
            pl.y = plat.y - (float)PH;
            pl.vy = 0.0f;
            pl.ground = true;
            pl.jump_state = JumpState::GROUNDED;
            pl.jump_angle = 0.0f; // snap upright on landing
            on_platform = true;
            break;
        }
    }

    if (!on_platform)
    {
        // Pit detection: use center-X with small inset so edges are forgiving
        bool over_pit = false;
        float pcx = pl.x + (float)PW * 0.5f;
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
            if (pl.y > (float)SH)
            {
                G->die();
                return;
            }
        }
        else
        {
            float floor_y = (float)(GROUND_Y - PH);
            if (pl.y >= floor_y)
            {
                pl.y = floor_y;
                pl.vy = 0.0f;
                pl.ground = true;
                pl.jump_state = JumpState::GROUNDED;
                pl.jump_angle = 0.0f; // snap upright on landing
            }
        }
    }

    if (prev_jump != JumpState::GROUNDED && pl.jump_state == JumpState::GROUNDED)
    {
        G->events |= EV_LAND;
        G->burst(pl.x + PW * 0.5f, pl.y + PH, 5, 0.6f, 1.6f, 18.0f, pal::GOLD_DEEP, 2.5f);
    }

    // Platform underside collision — jumping into the bottom of a platform is fatal
    for (const auto &plat : G->platforms)
    {
        bool x_hit = pl.x + (float)PW > plat.x && pl.x < plat.x + plat.w;
        bool hit_underside = pl.vy < 0.0f &&
                             pl.y < plat.y + plat.h &&
                             pl.y + (float)PH > plat.y + plat.h;
        if (x_hit && hit_underside)
        {
            G->die();
            return;
        }
    }

    // Platform left-wall collision — player running into the face of a platform is fatal
    for (const auto &plat : G->platforms)
    {
        // Horizontal overlap: player right edge past platform left edge
        bool x_hit = pl.x + (float)PW > plat.x &&
                     pl.x < plat.x + plat.w;
        // Vertical overlap: player box overlaps platform box (not just the surface).
        // Use <= so a platform whose bottom edge exactly meets the player's top edge still kills.
        bool y_hit = pl.y + (float)PH > plat.y + 2.0f &&
                     pl.y <= plat.y + plat.h;
        // Only fatal when approaching from the left (platform left edge inside player)
        // and the player is not currently sitting on top of this platform
        bool on_top = pl.y + (float)PH <= plat.y + 2.0f;
        if (x_hit && y_hit && !on_top && pl.x + (float)PW > plat.x && pl.x < plat.x)
        {
            G->die();
            return;
        }
    }

    for (const auto &s : G->spikes)
    {
        if (collides(pl, s))
        {
            G->die();
            return;
        }
    }

    G->score += spd;

    // Trail samples only while airborne; fade out when grounded.
    if (!pl.ground)
    {
        G->trail.insert(G->trail.begin(), {pl.x, pl.y, pl.jump_angle});
        if (G->trail.size() > 7)
            G->trail.pop_back();
    }
    else if (!G->trail.empty())
        G->trail.pop_back();

    // Level completion: player scrolled past the finish line
    if (G->level_mode && G->level_finish_x > 0.0f && G->scroll_x >= G->level_finish_x)
    {
        G->state = State::COMPLETED;
        G->events |= EV_COMPLETE;
        G->burst(pl.x + PW * 0.5f, pl.y + PH * 0.5f, 24, 1.0f, 4.0f, 60.0f, pal::GOLD_LIGHT, 3.5f);
    }
}

static void step()
{
    if (G->state == State::PLAYING)
        step_game();
    G->bg_x += (G->state == State::PLAYING) ? G->speed : BASE_SPEED * 0.3f;
    step_particles();
}

// ─── Rendering ───────────────────────────────────────────────────────────────

static float wrap(float v, float period)
{
    float m = std::fmod(v, period);
    return m < 0.0f ? m + period : m;
}

static float ridge_height(float x, float seed)
{
    return std::sin(x * 0.0061f + seed) * 34.0f + std::sin(x * 0.0173f + seed * 2.3f) * 16.0f +
           std::sin(x * 0.041f + seed * 0.7f) * 5.0f;
}

static void draw_ridge(float parallax, float base_y, float seed, Rgba top, Rgba bottom)
{
    const float step_w = 12.0f;
    float offset = G->bg_x * parallax;
    for (float x = 0.0f; x < SW; x += step_w)
    {
        float y0 = base_y - ridge_height(x + offset, seed);
        float y1 = base_y - ridge_height(x + step_w + offset, seed);
        const SDL_FPoint p[4] = {{x, y0}, {x + step_w, y1}, {x + step_w, (float)GROUND_Y}, {x, (float)GROUND_Y}};
        B.quad4(p, top, top, bottom, bottom);
    }
}

static void draw_backdrop(SDL_Renderer *r, double now)
{
    B.rect(0, 0, SW, GROUND_Y, pal::SKY_TOP, pal::SKY_HORIZON);
    B.flush(r, SDL_BLENDMODE_NONE);

    // Stars twinkle; brighter near layers get a soft additive halo.
    float t = (float)(now / 1000.0);
    for (const auto &layer : G->star_layers)
    {
        float offset = G->bg_x * layer.parallax;
        for (const auto &st : layer.stars)
        {
            float x = SW - wrap(SW - st.x + offset, (float)SW);
            float twinkle = 0.75f + 0.25f * std::sin(t * (1.2f + st.size * 0.4f) + st.phase);
            Uint8 a = (Uint8)(255.0f * st.brightness * twinkle);
            Rgba c = (st.warm ? pal::STAR_WARM : pal::STAR).alpha(a);
            B.square(x, st.y, st.size * 0.5f, 0.785f, c);
            if (st.size > 2.3f)
                B.square(x, st.y, st.size * 1.6f, 0.785f, c.alpha((Uint8)(a * 0.12f)));
        }
    }
    B.flush(r, SDL_BLENDMODE_ADD);

    draw_ridge(0.09f, GROUND_Y - 120.0f, 1.7f, pal::RIDGE_FAR, pal::SKY_HORIZON);
    draw_ridge(0.2f, GROUND_Y - 48.0f, 4.1f, pal::RIDGE_NEAR, pal::RIDGE_FAR);
    B.flush(r, SDL_BLENDMODE_NONE);

    // Horizon haze over the ridges.
    B.rect(0, GROUND_Y - 90.0f, SW, 90.0f, pal::SKY_HORIZON.alpha(0), pal::SKY_HORIZON.alpha(120));
    B.flush(r, SDL_BLENDMODE_BLEND);
}

static void draw_ground(SDL_Renderer *r)
{
    B.rect(0, GROUND_Y, SW, SH - GROUND_Y, pal::GROUND_TOP, pal::GROUND_BOTTOM);
    B.flush(r, SDL_BLENDMODE_NONE);

    // Scrolling ticks give the floor a sense of speed.
    const float spacing = 64.0f;
    for (float x = -wrap(G->scroll_x, spacing); x < SW; x += spacing)
        B.rect(x, GROUND_Y + 6.0f, 1.0f, SH - GROUND_Y - 6.0f, pal::GROUND_TICK, pal::GROUND_TICK.alpha(0));
    B.flush(r, SDL_BLENDMODE_ADD);

    for (const auto &pit : G->pits)
    {
        float px = std::max(0.0f, pit.x), pr = std::min((float)SW, pit.x + pit.w);
        if (pr <= px)
            continue;
        B.rect(px, GROUND_Y - 1.0f, pr - px, SH - GROUND_Y + 1.0f, pal::PIT_TOP, pal::PIT_BOTTOM);
    }
    B.flush(r, SDL_BLENDMODE_NONE);

    // Gold rim along the ground surface, broken by pits.
    std::vector<std::pair<float, float>> segments{{0.0f, (float)SW}};
    for (const auto &pit : G->pits)
    {
        std::vector<std::pair<float, float>> next;
        for (auto [a, b] : segments)
        {
            if (pit.x + pit.w <= a || pit.x >= b)
            {
                next.push_back({a, b});
                continue;
            }
            if (pit.x > a)
                next.push_back({a, pit.x});
            if (pit.x + pit.w < b)
                next.push_back({pit.x + pit.w, b});
        }
        segments = std::move(next);
    }
    for (auto [a, b] : segments)
    {
        B.rect(a, GROUND_Y - 12.0f, b - a, 12.0f, pal::GOLD.alpha(0), pal::GOLD.alpha(34));
        B.rect(a, GROUND_Y - 1.0f, b - a, 2.0f, pal::GOLD);
    }
    // Pit lips: bright edge fading into the void.
    for (const auto &pit : G->pits)
    {
        if (pit.x > -4.0f && pit.x < SW)
            B.rect_h(pit.x - 3.0f, GROUND_Y - 1.0f, 3.0f, 26.0f, pal::GOLD_DEEP.alpha(0), pal::GOLD.alpha(150));
        float rx = pit.x + pit.w;
        if (rx > 0.0f && rx < SW + 4.0f)
            B.rect_h(rx, GROUND_Y - 1.0f, 3.0f, 26.0f, pal::GOLD.alpha(150), pal::GOLD_DEEP.alpha(0));
    }
    B.flush(r, SDL_BLENDMODE_ADD);
}

static void draw_platforms(SDL_Renderer *r)
{
    for (const auto &p : G->platforms)
    {
        if (p.x + p.w < 0 || p.x > SW)
            continue;
        B.rect(p.x, p.y, p.w, p.h, pal::PLATFORM_TOP, pal::PLATFORM_BOTTOM);
        B.rect(p.x, p.y + p.h - 2.0f, p.w, 2.0f, pal::SKY_TOP);
    }
    B.flush(r, SDL_BLENDMODE_NONE);
    for (const auto &p : G->platforms)
    {
        if (p.x + p.w < 0 || p.x > SW)
            continue;
        B.rect(p.x, p.y - 10.0f, p.w, 10.0f, pal::GOLD.alpha(0), pal::GOLD.alpha(30));
        B.rect(p.x, p.y, p.w, 2.0f, pal::GOLD);
        B.rect(p.x, p.y, 1.0f, p.h, pal::GOLD.alpha(70), pal::GOLD.alpha(0));
    }
    B.flush(r, SDL_BLENDMODE_ADD);
}

static void draw_spikes(SDL_Renderer *r)
{
    for (const auto &s : G->spikes)
    {
        if (s.x + s.w < 0 || s.x > SW)
            continue;
        float tip_x = s.x + s.w * 0.5f, tip_y = s.base_y - s.h;
        B.tri(s.x - 3.0f, s.base_y, pal::SPIKE_GLOW.alpha(0), tip_x, tip_y - 6.0f, pal::SPIKE_GLOW,
              s.x + s.w + 3.0f, s.base_y, pal::SPIKE_GLOW.alpha(0));
    }
    B.flush(r, SDL_BLENDMODE_ADD);
    for (const auto &s : G->spikes)
    {
        if (s.x + s.w < 0 || s.x > SW)
            continue;
        float tip_x = s.x + s.w * 0.5f, tip_y = s.base_y - s.h;
        // Lit left facet, shaded right facet.
        B.tri(s.x, s.base_y, pal::SPIKE_BASE, tip_x, tip_y, pal::SPIKE_TIP, tip_x, s.base_y, pal::SPIKE_BASE);
        B.tri(tip_x, s.base_y, pal::SPIKE_SHADE, tip_x, tip_y, pal::SPIKE_BASE, s.x + s.w, s.base_y, pal::SPIKE_SHADE);
    }
    B.flush(r, SDL_BLENDMODE_NONE);
}

static void draw_finish(SDL_Renderer *r, double now)
{
    if (!G->level_mode || G->level_finish_x <= 0.0f)
        return;
    float fx = G->level_finish_x - G->scroll_x + 120.0f;
    if (fx < -40.0f || fx > SW + 40.0f)
        return;
    float pulse = 0.5f + 0.5f * std::sin((float)(now / 300.0));
    Uint8 glow = (Uint8)(70 + 60 * pulse);
    B.rect_h(fx - 28.0f, 0, 28.0f, GROUND_Y, pal::GOLD.alpha(0), pal::GOLD.alpha(glow));
    B.rect_h(fx, 0, 28.0f, GROUND_Y, pal::GOLD.alpha(glow), pal::GOLD.alpha(0));
    B.rect(fx - 1.5f, 0, 3.0f, GROUND_Y, pal::GOLD_LIGHT);
    B.flush(r, SDL_BLENDMODE_ADD);
}

static void draw_player(SDL_Renderer *r)
{
    const Player &pl = G->player;
    const float half = PW * 0.5f;
    const float deg = (float)M_PI / 180.0f;

    for (size_t i = 0; i < G->trail.size(); ++i)
    {
        const auto &tp = G->trail[i];
        Uint8 a = (Uint8)(70.0f * (1.0f - (float)(i + 1) / 8.0f));
        B.square(tp.x + half - (float)(i + 1) * 3.0f, tp.y + half, half * 0.9f, tp.angle * deg, pal::GOLD.alpha(a));
    }
    if (G->state != State::DEAD)
        B.square(pl.x + half, pl.y + half, half * 1.7f, pl.jump_angle * deg, pal::GOLD.alpha(26));
    B.flush(r, SDL_BLENDMODE_ADD);

    if (G->state == State::DEAD)
        return;
    float cx = pl.x + half, cy = pl.y + half, rad = pl.jump_angle * deg;
    B.square(cx, cy, half, rad, pal::GOLD_LIGHT, pal::GOLD, pal::GOLD_DEEP, pal::GOLD);
    B.square(cx, cy, half * 0.62f, rad, pal::GOLD_DEEP);
    B.square(cx, cy, half * 0.46f, rad, pal::GOLD, pal::GOLD_LIGHT, pal::GOLD, pal::GOLD_DEEP);
    B.flush(r, SDL_BLENDMODE_NONE);
}

static void draw_particles(SDL_Renderer *r)
{
    for (const auto &p : G->particles)
    {
        float k = p.life / p.max_life;
        B.square(p.x, p.y, p.size * 0.5f * (0.4f + 0.6f * k), p.angle, p.color.alpha((Uint8)(255.0f * k)));
    }
    B.flush(r, SDL_BLENDMODE_ADD);
}

static void render(double now)
{
    SDL_Renderer *r = G->ren;
    SDL_SetRenderDrawColor(r, pal::SKY_TOP.r, pal::SKY_TOP.g, pal::SKY_TOP.b, 255);
    SDL_RenderClear(r);
    draw_backdrop(r, now);
    draw_platforms(r);
    draw_ground(r);
    draw_spikes(r);
    draw_finish(r, now);
    draw_player(r);
    draw_particles(r);
    SDL_RenderPresent(r);
}

// ─── Main loop ────────────────────────────────────────────────────────────────

static void frame()
{
    if (!G)
        return;
    // Input is owned by the host page; SDL events are drained only to keep the queue empty.
    SDL_Event e;
    while (SDL_PollEvent(&e))
    {
    }

    double now = emscripten_get_now();
    double dt = std::min(250.0, now - G->last_ms);
    G->last_ms = now;
    G->acc_ms += dt;
    while (G->acc_ms >= STEP_MS)
    {
        step();
        G->acc_ms -= STEP_MS;
    }
    render(now);
}

int main()
{
    // Keep SDL from capturing page-wide keyboard input; the host forwards jumps explicitly.
    SDL_SetHint(SDL_HINT_EMSCRIPTEN_KEYBOARD_ELEMENT, "#canvas");
    SDL_Init(SDL_INIT_VIDEO | SDL_INIT_EVENTS);
    SDL_GL_SetAttribute(SDL_GL_MULTISAMPLEBUFFERS, 1);
    SDL_GL_SetAttribute(SDL_GL_MULTISAMPLESAMPLES, 4);
    SDL_Window *win = SDL_CreateWindow(
        "The (Im)Possible Game", SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED, SW, SH, 0);
    SDL_Renderer *ren = SDL_CreateRenderer(
        win, -1, SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC);
    SDL_RenderSetLogicalSize(ren, SW, SH);

    G = new Game();
    G->win = win;
    G->ren = ren;
    G->last_ms = emscripten_get_now();

    emscripten_set_main_loop(frame, 0, 1);
    return 0;
}
