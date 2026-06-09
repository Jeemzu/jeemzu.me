#include <cstdio>

// Entry point for native testing.
// When compiled with emcc, main() still runs via Module.onRuntimeInitialized.
int main()
{
    printf("Hello from C++!\n");
    return 0;
}
