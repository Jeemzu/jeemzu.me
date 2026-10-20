# Dino Rush

Arcade racing / Jungle rivalry / One very important trophy

Race your friends through a prehistoric jungle to claim the coveted Bonk Trophy. Read the terrain, keep your momentum and make a spectacular nuisance of yourself.

Example design document. Sections 01-06 describe the full-game direction; First playable slice defines the initial implementation scope.

## Game direction

### Vision and player experience

Dino Rush is a third-person arcade racer in which dinosaurs compete on foot through a jungle that was not built to accommodate organized sport. Players race head to head with friends, taking shortcuts through giant roots, drifting around muddy bends and bonking rivals out of the best racing line.

The aim is approachable competition with enough control depth to reward practice. A new player should finish their first race laughing; an experienced player should finish it thinking about the corner they could have taken better.

### What distinguishes the game

| Direction | Design intent |
| --- | --- |
| Dinosaurs, not vehicles | Weight, posture and personality come from feet, tails and exaggerated body movement rather than engines. |
| A readable living jungle | Moving plants and wildlife create memorable landmarks. Hazards have clear warning cues and repeatable timing. |
| Contact without cruelty | Bonks disrupt a racing line but never remove control for long. A rivalry should survive the race. |
| Skill before unlocks | Every dinosaur uses the same racing statistics. Winning depends on route choice, timing and momentum, not accumulated upgrades. |

### Emotional experience

The jungle is exuberant, slightly ridiculous and welcoming. Close finishes create excitement; failed shortcuts create stories. A last-place dinosaur still gets a proper finish animation and another chance.

The Bonk Trophy is a golden fruit balanced on a stone dinosaur head. Nobody remembers who made it. Everybody agrees it is the most important object in the jungle.

## World and progression

### Setting and narrative

Once each wet season, the residents of Thunderleaf Jungle settle their most pressing question: who is fastest this time? An elderly ankylosaurus named Auntie Thump organizes the races and refuses to explain the trophy's history.

Tracks follow familiar places repurposed as questionable sporting venues. Root Rumble winds through enormous tree roots; Canopy Scramble crosses suspended branches; and Thunderfall Run descends past waterfalls and abandoned stone terraces.

Story appears through track details, brief pre-race exchanges and podium reactions. Cutscenes never interrupt a race, and repeat players can skip introductions.

### Progression

1. Complete a short practice trail or skip directly to a race.
2. Race individual tracks to learn their routes and earn cosmetic Jungle Tokens.
3. Enter the three-race Bonk Cup. Each race awards 10, 7, 5 and 3 points for first through fourth place.
4. Award the Bonk Trophy to the highest total. A tie is decided by placement in the final race.
5. Return for rematches, personal bests and cosmetic unlocks.

All tracks and dinosaurs are available in friend lobbies from the start. Tokens unlock patterns, race bibs and celebration animations, never speed or stronger abilities. Players earn tokens for finishing, with a small placement bonus; leaving a race awards none.

### Characters

- Pip, a determined raptor whose confidence is considerably larger than their legs.
- Moss, a broad triceratops who treats every race as a pleasant walk taken much too quickly.
- Tumble, an ankylosaurus with excellent balance until it matters.
- Fern, a parasaurolophus who announces every overtake with unnecessary enthusiasm.

Different silhouettes and animations communicate personality, but collision footprints, acceleration, top speed and ability rules remain identical.

### Character references

![T. rex anatomy and expressive silhouette reference. Supplied reference: trex.png; adapt the proportions to the game's rounded style.](images/trex.png)

![Saddle and harness detailing reference. Supplied Adobe Stock preview: saddle.jpg, asset 277809967; watermark preserved. Costume inspiration only, not a mounted-racing mechanic.](images/saddle.jpg)

## Core gameplay

### Core loop

1. Create or join a friend lobby, choose a dinosaur and ready up.
2. Read the starting countdown and time an opening sprint.
3. Build momentum through running, drifting and clean landings.
4. Choose between a dependable main route and a faster, riskier shortcut.
5. Collect a jungle trick, use it to protect a line or disrupt a rival, and race to the finish.
6. Review placements, celebrate the good bits and vote for the next track.

Standard races contain three laps and target three to five minutes. The host can choose a single race or a Bonk Cup. Up to four players race together, with optional AI filling empty places.

### Starting-line reference

![Starting-grid staging, clear finish-line markings and spectator placement. Supplied game screenshot: startup.jpg; composition reference, not Dino Rush gameplay.](images/startup.jpg)

### Movement and momentum

Forward input accelerates toward the shared top speed. Steering remains responsive at low speed and widens naturally at full sprint. Braking trades speed for a tighter line.

Holding drift while steering starts a slide. Maintaining a controlled slide for 0.8 seconds charges a short boost; release grants 1.2 seconds of increased speed. Repeated taps do not build charge. Colliding with a wall cancels the stored boost.

Jumping clears small roots and puddles. Landing within the marked trail preserves momentum; landing in deep mud slows the dinosaur until it returns to firm ground. Shortcut jumps trade a quicker line for a visible risk, not a hidden dice roll.

### Track rules and hazards

Checkpoints must be crossed in order before a lap counts. Missing one shows a return marker; falling out of bounds returns the player to their last valid checkpoint after a two-second recovery.

- Mud pools reduce speed while occupied and never trap the player.
- Snapping flowers close on a visible two-second warning cycle.
- Rolling fruit crosses the track at fixed, telegraphed intervals.
- Root ramps offer shortcuts with a clear landing zone and a safe main-route alternative.

Hazards use motion and sound as well as color. Decorative wildlife never unexpectedly blocks the racing line.

### Race completion

Finishing requires three valid laps. Once the leader finishes, remaining racers have 45 seconds to finish; unfinished racers are ranked by completed laps, checkpoint progress and distance along the next segment.

If two racers cross on the same simulation tick, their crossing fraction determines order; an exact tie uses their stable lobby slot. Disconnecting racers are marked DNF and placed behind connected finishers. If everyone leaves, the session ends without a cup award.

## Rivalry and character systems

### Bonking

A bonk is a short shoulder check, not a combat encounter. The player can bonk a nearby rival beside or slightly ahead of them, with a three-second cooldown. A successful hit nudges the target sideways and briefly reduces speed; it never reverses their facing or launches them off the track.

After any bonk or trick hit, the target receives two seconds of hit protection, shown by a ring of circling leaves. Protected racers still collide with track geometry but cannot receive another player-induced slowdown. There is no health bar, damage progression or elimination.

### Jungle tricks

Collecting a seed pod grants one trick. A player holds only one at a time; all tricks are available at every placement, with no paid or unlock-based advantages.

| Trick | Effect | Counterplay |
| --- | --- | --- |
| Spring Mango | A straight-line burst of speed for 1.5 seconds. | Requires a clear line; cannot steer sharply during the burst. |
| Mud Puff | Leaves a small slowing patch for four seconds. | A visible brown cloud marks the patch; jump or steer around it. |
| Leaf Guard | Blocks one bonk or trick hit within five seconds. | The visible shield expires and does not prevent terrain penalties. |

Trick effects do not stack. New slowdown effects cannot extend an active hit reaction. Placement is not secretly changed by rubber-banding player speed.

### Difficulty and assistance

Solo practice offers relaxed and standard AI. Relaxed opponents use slower target speeds and fewer shortcuts; neither difficulty teleports opponents ahead.

Optional steering assistance gently discourages leaving the track, and auto-accelerate removes the need to hold forward input. Both are available in friend lobbies. Assistance never supplies a faster racing line than manual control can achieve.

## Presentation and interaction

### Art direction

Use stylized, rounded dinosaurs against lush shapes with broad areas of readable color. Large leaves, layered roots and distant waterfalls establish jungle scale without filling the road with visual clutter.

The racing surface has a quieter value range than the surrounding vegetation. Hazards, trick pods and shortcut entrances use distinct silhouettes. Cosmetics must preserve character readability and cannot disguise a shield or hit-protection state.

The supplied images are visual references, not finished Dino Rush assets. Realistic dinosaur studies inform silhouettes and jungle scale; the final presentation remains rounded and stylized. Existing-game screenshots inform composition and feedback, not additional mechanics or platform commitments.

### Jungle references

![Dense canopy, layered leaves and filtered light. Supplied environment reference: visualref1.jpg; keep this density outside the readable racing surface.](images/visualref1.jpg)

![Prehistoric jungle scale, distant cliffs and a water crossing. Supplied environment reference: visualref2.jpg; inspiration for Thunderfall Run's backdrop.](images/visualref2.jpg)

![Dinosaur silhouettes framed by foliage. Supplied composition reference: visualref3.jpg; the checkerboard is part of the supplied image, not a proposed game effect.](images/visualref3.jpg)

### Camera and interface

A third-person chase camera keeps the next bend visible and looks slightly into turns. Camera collision brings it forward rather than allowing foliage or walls to hide the dinosaur. Players can disable camera shake, motion blur and speed lines independently.

The race HUD shows position, lap, held trick, bonk cooldown and a compact route map. Rival names are readable above nearby racers. The last lap and finish countdown use text and sound together.

Menus support controller focus, keyboard navigation, scalable text and remappable inputs. Player identity uses names and icons rather than color alone. Split-screen gives each player their own HUD without shrinking essential labels below the supported minimum.

### Interface references

![Focused controller instruction over a readable racing view. Supplied game screenshot: ui1.jpg; reference for tutorial prompts, not a flying mechanic.](images/ui1.jpg)

![High-contrast icon grouping and focused selection. Supplied game screenshot: ui2.jpg; layout reference only, not a random reward wheel or mobile-control requirement.](images/ui2.jpg)

### Feedback and results references

![Brief character reaction presented without hiding the route ahead. Supplied game screenshot: bm_quotes.jpg; reference for optional rivalry barks.](images/bm_quotes.jpg)

![Celebratory trophy reveal with a clear result heading. Supplied game screenshot: victory.jpg; presentation reference, not the final Bonk Trophy design or touch-control requirement.](images/victory.jpg)

### Audio and animation

Percussion, wooden instruments and playful calls support the race without obscuring warning cues. Music gains an additional rhythmic layer on the final lap rather than simply becoming louder.

Footfalls reflect mud, wood and stone. Drift charge, boost release, approaching hazards and shield breaks have distinct sounds. Subtitles cover spoken barks; separate music, effects and voice sliders are available.

Leaning communicates turns; skidding feet communicate lost grip. Bonks use a squash, a short stumble and a soft wooden knock. Recovery blends back into running quickly. Finish celebrations are characterful but can be skipped after results are available.

## Implementation overview

### Systems and technology

Target Unity with URP and a fixed-step race simulation. Separate input, movement, checkpoint progress, race rules, presentation and persistence so the same race rules can serve local and online play.

| System | Planned implementation |
| --- | --- |
| Movement | Shared kinematic motor with tunable acceleration, drift, jump and boost rules. |
| Race authority | A race controller validates checkpoint order, lap completion, item use and final placement. |
| Multiplayer | Local split-screen and private online lobbies; online host validates race state with client prediction for local movement. |
| Track content | Authored checkpoint routes, hazard timelines, respawn anchors and AI racing lines. |
| Presentation | Animation and audio consume race events without deciding race outcomes. |
| Persistence | Versioned local settings, cosmetic unlocks and personal bests; no account required for offline play. |

Private online racing is a full-game target, not a first-slice dependency. Hosting, relay service and platform invitation choices require a separate technical spike before implementation. If the host disconnects, the lobby ends with a clear message; host migration is not planned for launch.

### Controls and save data

- Controller: left stick to steer, right trigger to accelerate, left trigger to brake, left shoulder to drift, south face button to jump, west face button to bonk and north face button to use a trick.
- Keyboard: WASD to drive, Shift to drift, Space to jump, J to bonk and K to use a trick. All gameplay actions are remappable.
- Save settings when confirmed and rewards after results are finalized. Write atomically; report a failed save and allow retry without blocking another race.
- Store track best times only for completed, unassisted solo time trials. Friend races and assisted runs do not overwrite that record.
- Pausing freezes offline solo races. In local multiplayer, pausing requires all players to confirm; online menus never pause the simulation.

## First playable slice

### Scope

Build one complete, repeatable two-player local race on Root Rumble. This slice proves that racing through the jungle and bonking a friend is enjoyable before building a wider content or networking system.

Included: two controller-driven dinosaurs, one jungle circuit with three laps, a main route and one root-ramp shortcut, drifting and jumping, bonking, Spring Mango pods, one mud pool, checkpoint recovery, countdown, results and rematch.

Excluded: online play, AI racers, split keyboard input, four-player support, additional tracks, Bonk Cup scoring, cosmetic progression, other tricks and narrative cutscenes. Use two character appearances with identical movement and collision rules. The Bonk Trophy appears on the race winner's results screen.

### Tutorial sequence

1. Let each player accelerate, steer and brake in a safe starting clearing.
2. Introduce a wide drift corner with a visible charge-and-release cue.
3. Place a small root across the practice lane to teach jumping.
4. Provide a stationary practice target for a bonk, then demonstrate hit protection.
5. Offer a Spring Mango pod and an unobstructed stretch to use it.
6. Start a full race without further mandatory prompts. Players may skip or replay practice.

### Completion requirements

- Both players can finish a three-lap race, see correct placements and start a rematch without restarting the application.
- Missing a checkpoint cannot grant a lap; leaving the track returns the racer to their last valid checkpoint within two seconds.
- A bonk cannot hit during its three-second cooldown, and a protected target cannot receive a second player-induced slowdown within two seconds.
- Drift boost requires at least 0.8 seconds of continuous valid drift and lasts 1.2 seconds after release.
- A finish starts the 45-second trailing-racer timer; expiry produces results even if the other racer stops moving.
- Both views show readable position, lap and held trick at 1920 x 1080. Controller focus works in practice, results and rematch menus.
- Target 60 fps at 1920 x 1080 on a Windows PC with a Ryzen 5 3600, GTX 1660 and 16 GB RAM; measure the complete split-screen race on that hardware before declaring the slice complete.
- In a small formative playtest, at least four of five new players finish practice and use a drift boost without facilitator input. Record where the remaining player gets stuck.

## Audience and release

### Target audience

Players who enjoy friendly arcade competition, expressive characters and short sessions with a familiar group. The intended audience includes families and mixed-experience friends; mastery should come from readable racing decisions, not memorizing a long ability list.

The tone targets broadly family-friendly play. Final age ratings depend on the finished content and regional review rather than an assumed rating.

### Platforms and monetization

Plan a premium Windows release with local split-screen and private online races for up to four players. Controller is the preferred racing input; keyboard remains fully supported for solo and online play. Console releases are a later possibility, not a launch commitment.

The purchase includes all launch tracks, dinosaurs and gameplay systems. Cosmetics are earned through play. No loot boxes, paid stat upgrades, advertising or battle pass.

### Release boundaries

The launch target is three jungle tracks, four dinosaurs, single races, the Bonk Cup, solo practice and private friend lobbies. Public matchmaking, ranked seasons, cross-platform play, track editing and live-service events are out of scope.

Proceed from the local first playable to an online technical prototype, then a content-complete alpha and accessibility/performance pass. Set a release date only after multiplayer reliability and the full track-production cost are demonstrated.
