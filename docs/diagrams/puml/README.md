# PlantUML Source Diagrams

This directory contains PlantUML (`.puml`) source files for selected UML diagrams. They are an **alternate format** for the canonical Mermaid diagrams under `docs/diagrams/*.md`.

## Status

| | |
|---|---|
| **Canonical UML 9-set** | `docs/diagrams/*.md` (Mermaid) — referenced by EDD §3.9.1 cross-reference table |
| **PlantUML sources here** | parallel format, useful for tools that prefer PlantUML rendering (IntelliJ PlantUML plugin, plantuml-server, etc.) |
| **Drift policy** | If a `.puml` source disagrees with the corresponding canonical `.md`, the canonical Mermaid file wins. |

## Files

| File | Equivalent canonical Mermaid file |
|---|---|
| `class-diagram.puml` | `docs/diagrams/class-domain.md` (single-tier; the canonical set is split into class-domain / class-application / class-infra-presentation) |
| `component-diagram.puml` | `docs/diagrams/component.md` |
| `dataflow-diagram.puml` | `docs/diagrams/communication.md` (data-flow is rendered as a Communication diagram in canonical set) |
| `deployment.puml` | `docs/diagrams/deployment.md` |
| `sequence-auth.puml` | `docs/diagrams/sequence-claim-flow.md` |
| `sequence-battle.puml` | `docs/diagrams/sequence-arena-battle.md` |
| `state-battle.puml` | `docs/diagrams/state-machine-arena-match.md` |
| `state-pet.puml` | `docs/diagrams/state-machine-pet-lifecycle.md` |
| `usecase-diagram.puml` | `docs/diagrams/use-case.md` |

## Maintenance

When a domain change requires updating a diagram, update the **canonical Mermaid** file first (`docs/diagrams/*.md`). The matching `.puml` file in this directory may be regenerated or updated in the same PR for tools that prefer the PlantUML format. CI runs no automated equivalence check between the two formats — visual review during PR is the gate.

EDD §3.9 inline diagrams use ` ```puml ` fenced blocks for historical readability. Those inline blocks render via PlantUML; downstream tools (RTM, code-gen scaffold) consume the canonical Mermaid files, not the inline blocks.
