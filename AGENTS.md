# AGENTS.md

Instructions for AI coding agents working in this repository.

## Skills

This project has agent skills installed under `.agents/skills/` (open Agent Skills standard). Each skill is a self-contained folder with a `SKILL.md` containing instructions, patterns, and reference material.

**Before writing or reviewing any Swift/SwiftUI code, load the matching skill** by reading `.agents/skills/<skill-name>/SKILL.md`. All skills target iOS 26+ / Swift 6.3 and avoid deprecated APIs.

| Skill | Load it when working on... |
|---|---|
| `swiftui-patterns` | General SwiftUI views: `@Observable` state ownership, `@State`/`@Bindable`/`@Environment` wiring, view composition, MV architecture, async loading with `.task` |
| `swiftui-navigation` | `NavigationStack`, `NavigationSplitView`, sheets, tabs, programmatic navigation, deep linking |
| `swiftui-liquid-glass` | iOS 26 Liquid Glass: `glassEffect`, `GlassEffectContainer`, morphing transitions, scroll edge effects |
| `swiftui-animation` | Spring animations, `PhaseAnimator`, `KeyframeAnimator`, `matchedGeometryEffect`, SF Symbol animations |
| `swiftui-gestures` | Tap, drag, magnify, rotate, long press, simultaneous/sequential gesture composition |
| `swiftui-layout-components` | Stacks, `Grid`, `LazyVGrid`, the `Layout` protocol, `ViewThatFits`, custom layouts, forms, lists |
| `swiftui-performance` | Rendering performance, view update optimization, layout thrash, Instruments profiling |
| `swiftui-uikit-interop` | `UIViewRepresentable`, `UIHostingController`, Coordinator pattern, UIKit→SwiftUI migration |
| `swiftui-webkit` | `WebView`, `WebPage`, navigation policies, JavaScript calls, custom URL schemes |
| `focus-engine` | `@FocusState`, `defaultFocus`, `focusSection`, focus restoration, `UIFocusGuide` |

### Conventions for using the skills

- Load only the skill relevant to the task — do not concatenate all skills into context.
- Skills may point to files in their own `references/` subfolder; read those when the task touches that topic.
- Follow the patterns in the loaded skill (e.g., `NavigationStack` not `NavigationView`, `@Observable` not `ObservableObject`, `foregroundStyle` over `foregroundColor`).
- When the skill and existing project code conflict, match the project and flag the deviation.
- To add more skills from the same source: `npx skills add nastylex/swift-ios-skills --skill <name>`. To update: `npx skills update`.
