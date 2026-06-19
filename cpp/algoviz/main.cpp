// Algorithm Visualizer — Emscripten/SDL2 WASM module
// Pre-computes all algorithm steps, then plays them back at configurable speed.
// Rendered bars are colored by state: default, comparing, moved, pivot, done, found.

#include <SDL2/SDL.h>
#include <emscripten/emscripten.h>
#include <algorithm>
#include <cmath>
#include <random>
#include <vector>

// ─── Constants ────────────────────────────────────────────────────────────────

static constexpr int SW = 960;
static constexpr int SH = 720;

// Algorithm IDs (kept sparse so sort/search ranges don't overlap)
static constexpr int ALGO_BUBBLE = 0;
static constexpr int ALGO_SELECTION = 1;
static constexpr int ALGO_INSERTION = 2;
static constexpr int ALGO_MERGE = 3;
static constexpr int ALGO_QUICK = 4;
static constexpr int ALGO_HEAP = 5;
static constexpr int ALGO_LINEAR = 10;
static constexpr int ALGO_BINARY = 11;
static constexpr int ALGO_JUMP = 12;

// Input sizes indexed 0-4: Very Small → Very Large
static constexpr int INPUT_SIZES[5] = {8, 16, 32, 64, 128};

// ─── Step system ─────────────────────────────────────────────────────────────

enum class StepType : uint8_t
{
    COMPARE,     // highlight two indices (or one vs target when j == -1)
    SWAP,        // swap arr[i] ↔ arr[j], count as 1 move
    INSERT,      // write arr[i] = extra, count as 1 move
    SET_PIVOT,   // mark index i as pivot
    CLEAR_PIVOT, // unmark pivot
    MARK_DONE,   // mark index i as sorted/complete
    MARK_RANGE,  // mark [i, j] inclusive as sorted/complete
    FOUND,       // search: target found at index i
    NOT_FOUND,   // search: target absent
    SEARCH_RANGE // binary/jump search: update active search window [i, j]
};

struct Step
{
    StepType type = StepType::COMPARE;
    int i = -1;
    int j = -1;
    int extra = 0; // value for INSERT
};

// ─── Visualizer state ─────────────────────────────────────────────────────────

enum class RunState : int
{
    IDLE = 0,
    RUNNING = 1,
    PAUSED = 2,
    DONE = 3
};

struct Viz
{
    // SDL handles
    SDL_Window *win = nullptr;
    SDL_Renderer *ren = nullptr;

    // Array data
    int n = 0;
    std::vector<int> arr;    // display array, modified during playback
    std::vector<int> orig;   // immutable copy for reset
    std::vector<Step> steps; // pre-recorded algorithm steps
    int step_idx = 0;
    bool configured = false;

    // Per-frame visual highlights (reset before each step is applied)
    int hi_a = -1, hi_b = -1;           // compared indices (amber)
    int sw_a = -1, sw_b = -1;           // swapped / written indices (red)
    int pivot = -1;                     // pivot index (purple)
    int found_idx = -1;                 // found element (bright green)
    int search_lo = -1, search_hi = -1; // binary/jump search window
    bool not_found = false;
    std::vector<bool> done; // permanently marked as sorted/found

    // Stats (accumulated during playback)
    int comparisons = 0;
    int moves = 0;

    // Config
    int algo_id = -1;
    int target_val = -1; // search target value (-1 for sort)

    // Playback
    RunState run_state = RunState::IDLE;
    float speed = 1.0f; // user-facing multiplier
    float accum = 0.0f;
    float base_sps = 20.0f; // steps-per-second at speed == 1.0
    Uint32 last_tick = 0;
};

static Viz G;

// ─── Step recorder helper ─────────────────────────────────────────────────────

struct Rec
{
    std::vector<Step> &s;

    void cmp(int i, int j) { s.push_back({StepType::COMPARE, i, j}); }
    void swp(std::vector<int> &a, int i, int j)
    {
        s.push_back({StepType::SWAP, i, j});
        std::swap(a[i], a[j]);
    }
    void ins(std::vector<int> &a, int i, int v)
    {
        a[i] = v;
        s.push_back({StepType::INSERT, i, -1, v});
    }
    void done(int i) { s.push_back({StepType::MARK_DONE, i}); }
    void range_done(int lo, int hi) { s.push_back({StepType::MARK_RANGE, lo, hi}); }
    void pivot_set(int i) { s.push_back({StepType::SET_PIVOT, i}); }
    void pivot_clr() { s.push_back({StepType::CLEAR_PIVOT}); }
    void found(int i) { s.push_back({StepType::FOUND, i}); }
    void not_found() { s.push_back({StepType::NOT_FOUND}); }
    void srange(int lo, int hi) { s.push_back({StepType::SEARCH_RANGE, lo, hi}); }
};

// ─── Sorting algorithms ───────────────────────────────────────────────────────

static void record_bubble(std::vector<int> a, Rec &r)
{
    int n = (int)a.size();
    for (int i = 0; i < n - 1; ++i)
    {
        for (int j = 0; j < n - 1 - i; ++j)
        {
            r.cmp(j, j + 1);
            if (a[j] > a[j + 1])
                r.swp(a, j, j + 1);
        }
        r.done(n - 1 - i);
    }
    r.done(0);
}

static void record_selection(std::vector<int> a, Rec &r)
{
    int n = (int)a.size();
    for (int i = 0; i < n - 1; ++i)
    {
        int m = i;
        for (int j = i + 1; j < n; ++j)
        {
            r.cmp(m, j);
            if (a[j] < a[m])
                m = j;
        }
        if (m != i)
            r.swp(a, i, m);
        r.done(i);
    }
    r.done(n - 1);
}

static void record_insertion(std::vector<int> a, Rec &r)
{
    int n = (int)a.size();
    r.done(0);
    for (int i = 1; i < n; ++i)
    {
        int key = a[i], j = i - 1;
        while (j >= 0)
        {
            r.cmp(j, j + 1);
            if (a[j] > key)
            {
                r.ins(a, j + 1, a[j]);
                --j;
            }
            else
                break;
        }
        r.ins(a, j + 1, key);
        r.done(i);
    }
}

static void merge_op(std::vector<int> &a, int lo, int mid, int hi, Rec &r)
{
    std::vector<int> L(a.begin() + lo, a.begin() + mid + 1);
    std::vector<int> R(a.begin() + mid + 1, a.begin() + hi + 1);
    int i = 0, j = 0, k = lo;
    while (i < (int)L.size() && j < (int)R.size())
    {
        r.cmp(lo + i, mid + 1 + j);
        if (L[i] <= R[j])
            r.ins(a, k++, L[i++]);
        else
            r.ins(a, k++, R[j++]);
    }
    while (i < (int)L.size())
        r.ins(a, k++, L[i++]);
    while (j < (int)R.size())
        r.ins(a, k++, R[j++]);
    r.range_done(lo, hi);
}

static void msort(std::vector<int> &a, int lo, int hi, Rec &r)
{
    if (lo >= hi)
    {
        r.done(lo);
        return;
    }
    int m = (lo + hi) / 2;
    msort(a, lo, m, r);
    msort(a, m + 1, hi, r);
    merge_op(a, lo, m, hi, r);
}

static void record_merge(std::vector<int> a, Rec &r) { msort(a, 0, (int)a.size() - 1, r); }

static int qpartition(std::vector<int> &a, int lo, int hi, Rec &r)
{
    r.pivot_set(hi);
    int p = lo - 1;
    for (int j = lo; j < hi; ++j)
    {
        r.cmp(j, hi);
        if (a[j] <= a[hi])
        {
            ++p;
            if (p != j)
                r.swp(a, p, j);
        }
    }
    r.swp(a, p + 1, hi);
    r.pivot_clr();
    r.done(p + 1);
    return p + 1;
}

static void qsort_r(std::vector<int> &a, int lo, int hi, Rec &r)
{
    if (lo >= hi)
    {
        if (lo == hi)
            r.done(lo);
        return;
    }
    int p = qpartition(a, lo, hi, r);
    qsort_r(a, lo, p - 1, r);
    qsort_r(a, p + 1, hi, r);
}

static void record_quick(std::vector<int> a, Rec &r) { qsort_r(a, 0, (int)a.size() - 1, r); }

static void heapify(std::vector<int> &a, int n, int i, Rec &r)
{
    int lg = i, l = 2 * i + 1, rr = 2 * i + 2;
    if (l < n)
    {
        r.cmp(l, lg);
        if (a[l] > a[lg])
            lg = l;
    }
    if (rr < n)
    {
        r.cmp(rr, lg);
        if (a[rr] > a[lg])
            lg = rr;
    }
    if (lg != i)
    {
        r.swp(a, i, lg);
        heapify(a, n, lg, r);
    }
}

static void record_heap(std::vector<int> a, Rec &r)
{
    int n = (int)a.size();
    for (int i = n / 2 - 1; i >= 0; --i)
        heapify(a, n, i, r);
    for (int i = n - 1; i > 0; --i)
    {
        r.swp(a, 0, i);
        r.done(i);
        heapify(a, i, 0, r);
    }
    r.done(0);
}

// ─── Search algorithms ────────────────────────────────────────────────────────
// For search, j == -1 in a COMPARE step means "compare with target (off-screen)".

static void record_linear(std::vector<int> a, int target, Rec &r)
{
    for (int i = 0; i < (int)a.size(); ++i)
    {
        r.cmp(i, -1);
        if (a[i] == target)
        {
            r.found(i);
            return;
        }
    }
    r.not_found();
}

static void record_binary(std::vector<int> a, int target, Rec &r)
{
    int lo = 0, hi = (int)a.size() - 1;
    r.srange(lo, hi);
    while (lo <= hi)
    {
        int mid = (lo + hi) / 2;
        r.cmp(mid, -1);
        if (a[mid] == target)
        {
            r.found(mid);
            return;
        }
        if (a[mid] < target)
            lo = mid + 1;
        else
            hi = mid - 1;
        if (lo <= hi)
            r.srange(lo, hi);
    }
    r.not_found();
}

static void record_jump(std::vector<int> a, int target, Rec &r)
{
    int n = (int)a.size();
    int jstep = (int)std::sqrt((double)n);
    if (jstep < 1)
        jstep = 1;
    int prev = 0;

    // Phase 1: jump ahead by √n blocks until we overshoot or reach end
    while (prev < n)
    {
        int chk = std::min(jstep, n) - 1;
        r.cmp(chk, -1);
        if (a[chk] >= target)
            break;
        prev = jstep;
        jstep += (int)std::sqrt((double)n);
    }

    if (prev >= n)
    {
        r.not_found();
        return;
    }

    // Phase 2: linear scan within the identified block
    int block_end = std::min(jstep, n);
    for (int i = prev; i < block_end; ++i)
    {
        r.cmp(i, -1);
        if (a[i] == target)
        {
            r.found(i);
            return;
        }
        if (a[i] > target)
            break;
    }
    r.not_found();
}

// ─── Step application ─────────────────────────────────────────────────────────

static void apply_step(const Step &s)
{
    // Reset transient single-frame highlights before each step
    G.hi_a = G.hi_b = G.sw_a = G.sw_b = -1;

    switch (s.type)
    {
    case StepType::COMPARE:
        G.hi_a = s.i;
        G.hi_b = s.j;
        ++G.comparisons;
        break;
    case StepType::SWAP:
        G.sw_a = s.i;
        G.sw_b = s.j;
        std::swap(G.arr[s.i], G.arr[s.j]);
        ++G.moves;
        break;
    case StepType::INSERT:
        G.sw_a = s.i;
        G.arr[s.i] = s.extra;
        ++G.moves;
        break;
    case StepType::SET_PIVOT:
        G.pivot = s.i;
        break;
    case StepType::CLEAR_PIVOT:
        G.pivot = -1;
        break;
    case StepType::MARK_DONE:
        if (s.i >= 0 && s.i < G.n)
            G.done[s.i] = true;
        break;
    case StepType::MARK_RANGE:
        for (int k = s.i; k <= s.j && k < G.n; ++k)
            G.done[k] = true;
        break;
    case StepType::FOUND:
        G.found_idx = s.i;
        if (s.i >= 0 && s.i < G.n)
            G.done[s.i] = true;
        break;
    case StepType::NOT_FOUND:
        G.not_found = true;
        break;
    case StepType::SEARCH_RANGE:
        G.search_lo = s.i;
        G.search_hi = s.j;
        break;
    }
}

// ─── Rendering ───────────────────────────────────────────────────────────────

struct Color
{
    Uint8 r, g, b;
};

static void fill(int x, int y, int w, int h, Color c)
{
    SDL_SetRenderDrawColor(G.ren, c.r, c.g, c.b, 255);
    SDL_Rect rc{x, y, w, h};
    SDL_RenderFillRect(G.ren, &rc);
}

static void render()
{
    // Clear to editor dark background
    SDL_SetRenderDrawColor(G.ren, 10, 10, 25, 255);
    SDL_RenderClear(G.ren);

    if (!G.configured)
    {
        SDL_RenderPresent(G.ren);
        return;
    }

    const int MX = 20;          // horizontal margin
    const int BTOP = 80;        // top of bar area (React overlay covers 0-46px)
    const int BBOT = 700;       // bottom of bar area (extended now bottom bar removed)
    const int BH = BBOT - BTOP; // 580 px
    const int BW = SW - 2 * MX; // 920 px

    // Bar width + inter-bar gap, scaled by n
    int gap = (G.n <= 16) ? 4 : (G.n <= 64) ? 2
                                            : 1;
    int bw = (BW - gap * (G.n - 1)) / G.n;
    if (bw < 1)
        bw = 1;

    // Search-range background (binary / jump search)
    bool is_search = (G.algo_id == ALGO_LINEAR ||
                      G.algo_id == ALGO_BINARY ||
                      G.algo_id == ALGO_JUMP);
    if (is_search && G.search_lo >= 0 && G.search_hi >= 0)
    {
        int x0 = MX + G.search_lo * (bw + gap);
        int x1 = MX + G.search_hi * (bw + gap) + bw;
        fill(x0, BTOP, x1 - x0, BH, {20, 20, 60});
    }

    // Draw bars
    for (int i = 0; i < G.n; ++i)
    {
        int bheight = (int)((float)G.arr[i] / (float)(G.n + 1) * (float)BH);
        int bx = MX + i * (bw + gap);
        int by = BBOT - bheight;

        Color col;
        if (i == G.found_idx)
            col = {197, 232, 164}; // found   — soft green  (#c5e8a4)
        else if (G.done[i])
            col = {168, 214, 126}; // sorted  — site green  (#a8d67e)
        else if (i == G.pivot)
            col = {190, 80, 220}; // pivot   — violet
        else if (i == G.sw_a || i == G.sw_b)
            col = {215, 55, 55}; // moved   — spike red   (#d73737)
        else if (i == G.hi_a || (G.hi_b >= 0 &&
                                 i == G.hi_b))
            col = {255, 215, 64}; // compare — gold        (#ffd740)
        else if (G.not_found)
            col = {60, 60, 70}; // not found — dark gray
        else
            col = {58, 110, 160}; // default — platform blue (#3a6ea0)

        fill(bx, by, bw, bheight, col);

        // Subtle 2-px top highlight for bar depth
        SDL_SetRenderDrawColor(G.ren, 255, 255, 255, 30);
        SDL_Rect top{bx, by, bw, 2};
        SDL_RenderFillRect(G.ren, &top);
    }

    SDL_RenderPresent(G.ren);
}

// ─── Configuration ────────────────────────────────────────────────────────────

static void do_configure(int algo_id, int size_idx)
{
    if (size_idx < 0)
        size_idx = 0;
    if (size_idx > 4)
        size_idx = 4;

    G.algo_id = algo_id;
    G.n = INPUT_SIZES[size_idx];
    G.steps.clear();
    G.step_idx = 0;
    G.comparisons = 0;
    G.moves = 0;
    G.hi_a = G.hi_b = G.sw_a = G.sw_b = G.pivot = G.found_idx = -1;
    G.search_lo = G.search_hi = -1;
    G.not_found = false;
    G.run_state = RunState::IDLE;
    G.accum = 0.0f;
    // Scale base speed with n so animations take similar wall-clock time across sizes
    G.base_sps = (float)G.n * 2.5f;

    std::mt19937 rng(SDL_GetTicks() ^ 0xdeadbeefU);

    // Build array 1..n
    G.arr.resize(G.n);
    for (int i = 0; i < G.n; ++i)
        G.arr[i] = i + 1;

    bool is_search = (algo_id == ALGO_LINEAR ||
                      algo_id == ALGO_BINARY ||
                      algo_id == ALGO_JUMP);
    if (is_search)
    {
        // Keep sorted (required by binary/jump; linear can use unsorted too)
        std::uniform_int_distribution<int> td(1, G.n);
        G.target_val = td(rng);
        // 20% chance the target is missing
        if (std::uniform_int_distribution<int>(1, 5)(rng) == 1)
            G.target_val = G.n + 1; // value not in [1..n]
        if (algo_id == ALGO_LINEAR)
            std::shuffle(G.arr.begin(), G.arr.end(), rng);
    }
    else
    {
        std::shuffle(G.arr.begin(), G.arr.end(), rng);
        G.target_val = -1;
    }

    G.orig = G.arr;
    G.done.assign(G.n, false);

    // Record all steps against a working copy
    Rec rec{G.steps};
    std::vector<int> work = G.arr;

    switch (algo_id)
    {
    case ALGO_BUBBLE:
        record_bubble(work, rec);
        break;
    case ALGO_SELECTION:
        record_selection(work, rec);
        break;
    case ALGO_INSERTION:
        record_insertion(work, rec);
        break;
    case ALGO_MERGE:
        record_merge(work, rec);
        break;
    case ALGO_QUICK:
        record_quick(work, rec);
        break;
    case ALGO_HEAP:
        record_heap(work, rec);
        break;
    case ALGO_LINEAR:
        record_linear(work, G.target_val, rec);
        break;
    case ALGO_BINARY:
        record_binary(work, G.target_val, rec);
        break;
    case ALGO_JUMP:
        record_jump(work, G.target_val, rec);
        break;
    default:
        break;
    }

    G.configured = true;
}

// ─── Main loop ────────────────────────────────────────────────────────────────

static void main_loop()
{
    SDL_Event e;
    while (SDL_PollEvent(&e))
    {
        if (e.type == SDL_QUIT)
            emscripten_cancel_main_loop();
    }

    Uint32 now = SDL_GetTicks();
    float dt = (float)(now - G.last_tick) * 0.001f;
    if (dt > 0.1f)
        dt = 0.1f; // cap delta to avoid huge jumps after tab-switch
    G.last_tick = now;

    if (G.run_state == RunState::RUNNING && G.configured)
    {
        G.accum += dt * G.speed * G.base_sps;
        int advance = (int)G.accum;
        G.accum -= (float)advance;

        for (int i = 0; i < advance; ++i)
        {
            if (G.step_idx >= (int)G.steps.size())
            {
                G.run_state = RunState::DONE;
                // Ensure everything is marked done on completion
                for (int k = 0; k < G.n; ++k)
                    G.done[k] = true;
                G.hi_a = G.hi_b = G.sw_a = G.sw_b = G.pivot = -1;
                break;
            }
            apply_step(G.steps[G.step_idx++]);
        }
    }

    render();
}

// ─── Exported API (called from JavaScript via cwrap) ─────────────────────────

extern "C"
{

    // Initialise with a chosen algorithm and input-size index (0-4).
    // Call this right after the module loads, before viz_start().
    EMSCRIPTEN_KEEPALIVE void viz_configure(int algo_id, int size_idx)
    {
        do_configure(algo_id, size_idx);
    }

    // Begin / resume playback.
    EMSCRIPTEN_KEEPALIVE void viz_start()
    {
        if (G.configured)
            G.run_state = RunState::RUNNING;
    }

    // Pause without losing position.
    EMSCRIPTEN_KEEPALIVE void viz_pause()
    {
        if (G.run_state == RunState::RUNNING)
            G.run_state = RunState::PAUSED;
    }

    // Resume after pause.
    EMSCRIPTEN_KEEPALIVE void viz_resume()
    {
        if (G.run_state == RunState::PAUSED)
            G.run_state = RunState::RUNNING;
    }

    // Advance exactly one step (only works while IDLE or PAUSED).
    EMSCRIPTEN_KEEPALIVE void viz_step_once()
    {
        if (!G.configured)
            return;
        if (G.run_state != RunState::PAUSED && G.run_state != RunState::IDLE)
            return;
        if (G.step_idx >= (int)G.steps.size())
            return;
        apply_step(G.steps[G.step_idx++]);
        if (G.step_idx >= (int)G.steps.size())
        {
            G.run_state = RunState::DONE;
            for (int k = 0; k < G.n; ++k)
                G.done[k] = true;
        }
    }

    // Reset to the initial unsorted/unsearched state.
    EMSCRIPTEN_KEEPALIVE void viz_reset()
    {
        if (!G.configured)
            return;
        G.arr = G.orig;
        G.step_idx = 0;
        G.comparisons = 0;
        G.moves = 0;
        G.hi_a = G.hi_b = G.sw_a = G.sw_b = G.pivot = G.found_idx = -1;
        G.search_lo = G.search_hi = -1;
        G.not_found = false;
        G.done.assign(G.n, false);
        G.accum = 0.0f;
        G.run_state = RunState::IDLE;
    }

    // Set playback speed multiplier (0.1 – 32×).
    EMSCRIPTEN_KEEPALIVE void viz_set_speed(float s)
    {
        G.speed = (s < 0.1f) ? 0.1f : (s > 32.0f) ? 32.0f
                                                  : s;
    }

    EMSCRIPTEN_KEEPALIVE int viz_get_state() { return (int)G.run_state; }
    EMSCRIPTEN_KEEPALIVE int viz_get_comparisons() { return G.comparisons; }
    EMSCRIPTEN_KEEPALIVE int viz_get_moves() { return G.moves; }
    EMSCRIPTEN_KEEPALIVE int viz_get_step() { return G.step_idx; }
    EMSCRIPTEN_KEEPALIVE int viz_get_total_steps() { return (int)G.steps.size(); }
    EMSCRIPTEN_KEEPALIVE int viz_get_target() { return G.target_val; }

    // Compatibility stubs so WasmGameContainer's polling still compiles cleanly.
    EMSCRIPTEN_KEEPALIVE float get_score() { return (float)G.step_idx; }
    EMSCRIPTEN_KEEPALIVE int get_state() { return (int)G.run_state; }

} // extern "C"

// ─── Entry point ─────────────────────────────────────────────────────────────

int main()
{
    SDL_Init(SDL_INIT_VIDEO);
    SDL_CreateWindowAndRenderer(SW, SH, 0, &G.win, &G.ren);
    SDL_SetWindowTitle(G.win, "Algorithm Visualizer");
    G.last_tick = SDL_GetTicks();
    emscripten_set_main_loop(main_loop, 0, 1);
    // Cleanup (unreachable in WASM but good practice)
    SDL_DestroyRenderer(G.ren);
    SDL_DestroyWindow(G.win);
    SDL_Quit();
    return 0;
}
