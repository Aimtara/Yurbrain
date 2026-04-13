# AI Contracts v1

Contracts:
- SummarizeContract
- ClassifyContract
- RelateContract
- FeedCardContract
- ItemChatContract
- TaskConversionContract

Global rules:
- structured outputs only
- validated before persistence
- confidence required
- grounding where applicable
- no silent mutation of source objects

Invocation:
- on-demand for most user actions
- batched for feed generation
- never block UI
