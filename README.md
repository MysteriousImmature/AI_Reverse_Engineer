# LLM Reverse Engineering Lab - Notes

The project explains how to characterize a Large Language Model through authorized black-box testing. Here, “reverse engineering” means developing an evidence-based understanding of observable model and service behavior. It does **not** mean stealing model weights, extracting private prompts, obtaining credentials, bypassing safeguards, or recovering proprietary training data.

## Safety and authorization boundary

Only test a model or endpoint that you own or have explicit permission to evaluate.

Before testing, confirm:

- The approved model, endpoint, account, and test environment.
- The permitted test period and request-rate limits.
- Whether prompts, outputs, and metadata may be stored.
- Whether personal, confidential, regulated, or client data is prohibited.
- Which tests are excluded by provider terms, licensing, or organizational policy.

The project intentionally focuses on benign behavioral measurements such as token usage, effective context behavior, output variability, instruction handling, tool-call reliability, latency, and error patterns.

## Core methodology

| Phase | Purpose | Expected output |
|---|---|---|
| 1. Frame a hypothesis | Define a falsifiable claim about one observable behavior. | Written hypothesis and success criteria |
| 2. Design a controlled probe | Change one independent variable while holding the others constant. | Test matrix and baseline |
| 3. Collect repeated trials | Record enough runs to distinguish a pattern from randomness. | Raw outputs and run metadata |
| 4. Compare signatures | Identify stable boundaries, discontinuities, and competing explanations. | Evidence summary |
| 5. Report with confidence | Separate direct observation from inference and limitations. | Auditable assessment |

### Example hypothesis format

```text
If [independent variable] changes, then [observable signal] will change
because [proposed mechanism].
```

Example:

```text
If temperature increases while the prompt and other generation parameters
remain fixed, the unique-output ratio will increase because the decoder is
sampling from a broader probability distribution.
```

## Probe families included in the webpage

### 1. Tokenizer behavior

**Objective:** Estimate segmentation tendencies using documented input-token usage.

Test paired strings that differ in one property, such as:

- One space versus two spaces.
- Lowercase versus uppercase text.
- Plain words versus punctuation.
- Compound words versus hyphenated words.
- ASCII versus approved Unicode samples.
- Natural language versus short code samples.

**Evidence:** Relative token-count differences across paired inputs.

**Important limitation:** Provider usage numbers can include templates, message wrappers, or billing adjustments. Token-count patterns may suggest a tokenizer family, but they do not prove the exact internal tokenizer.

### 2. Effective context behavior

**Objective:** Estimate the practical input boundary and identify position-sensitive recall.

Place a harmless synthetic marker near the beginning, middle, or end of controlled filler text. Increase the input size gradually and ask the model to return the marker.

Record separately:

- Request accepted or rejected.
- Marker recalled correctly or incorrectly.
- Finish reason.
- Input and output tokens.
- Latency.
- Marker position.

**Evidence:** Hard size errors, sudden truncation, recency effects, or gradual recall degradation.

**Important limitation:** A hosted service may route, summarize, truncate, retrieve, or transform input before the model receives it. The result describes effective service behavior, not necessarily the model’s attention architecture.

### 3. Sampling and decoding

**Objective:** Measure the relative stochastic behavior of the generated output.

Repeat the same benign prompt at fixed values of temperature, top-p, maximum output length, and seed when supported. Use at least 20 trials for each condition.

Useful measurements include:

- Unique-output ratio.
- Pairwise text similarity.
- Length variance.
- Format-adherence rate.
- Deterministic replay rate.
- Frequency of the most common response.

**Important limitation:** Server-side routing, undisclosed defaults, infrastructure nondeterminism, and model updates can introduce variation even when temperature is zero.

### 4. Instruction handling

**Objective:** Characterize how the service resolves harmless role, format, and conversation-history conflicts.

Use benign requests such as uppercase versus lowercase formatting. Change only one factor at a time:

- Message role.
- Delimiter type.
- Conversation history.
- Requested output format.
- Presence or absence of a harmless conflicting instruction.

**Evidence:** Stable priority resolution, formatting consistency, refusal wording, and conversation-history effects.

**Important limitation:** Do not ask the model to disclose hidden instructions, credentials, secrets, or internal policy text. Moderation, routing, retrieval, and orchestration layers may influence the response independently of model weights.

### 5. Tool-use reliability

**Objective:** Measure whether a model selects an appropriate safe mock tool and produces valid arguments.

Use side-effect-free sandbox tools and test:

- A request that requires no tool.
- A request that clearly requires one tool.
- An ambiguous request.
- A request requiring two tool calls.
- A controlled tool error.
- An enum or schema constraint.

Measure:

- Correct-tool selection rate.
- Unnecessary-tool call rate.
- JSON and schema validity.
- Argument repair after a tool error.
- Final-answer grounding in tool output.

Do not connect research probes to production actions, live administrative systems, or destructive functions.

## Evidence collection fields

Use the following minimum fields for every trial:

```text
experiment_id
run_id
timestamp
model_or_service
model_version_or_snapshot
prompt_hash
test_condition
fixed_parameters
changed_variable
raw_output
input_tokens
output_tokens
latency_ms
finish_reason
error_or_refusal
analyst_notes
```

Preserve the raw output separately from analyst interpretation. If the provider changes the model version or service behavior during testing, treat later runs as a different experimental population.

## What can and cannot be inferred

### Usually measurable or estimable

- Effective accepted-input boundary.
- Landmark recall at different input positions.
- Relative output variability.
- Formatting and schema adherence.
- Token-usage tendencies when reported.
- Refusal and error patterns.
- Latency and reliability characteristics.
- End-to-end tool-selection behavior.

### Not reliably recoverable from outputs

- Exact model weights.
- Exact proprietary architecture.
- Complete private training corpus.
- Exact hidden system instructions.
- Confidential provider configuration.
- Whether every observed behavior came from the model, wrapper, moderation layer, router, retrieval system, or tool orchestrator.

Several different systems can produce similar output signatures. Conclusions must therefore be phrased as supported inferences rather than facts about hidden internals.

## Confidence rubric

### Low confidence

- The result is based on few trials.
- The observation is unstable.
- Multiple competing explanations remain.
- Model version or parameters were not controlled.

### Medium confidence

- The result repeats under controlled conditions.
- At least one alternative explanation was tested.
- Service-layer explanations remain plausible.

### High confidence

- A stable behavior or boundary is repeatable across independent probes.
- Controls, repetitions, metadata, and raw evidence are complete.
- Competing explanations have been meaningfully tested.
- The conclusion remains limited to directly supported behavior.

## Webpage functionality

The source package includes:

- Responsive desktop and mobile layouts.
- Dark and light themes.
- An animated black-box model visualization built with CSS.
- Five interactive experiment tabs.
- Copyable Python-style probe examples.
- A direct-observation versus inference matrix.
- Copyable Markdown assessment template.
- A persistent readiness checklist using browser local storage.
- Accessibility labels, keyboard-focus styles, and reduced-motion support.

The copy buttons use the modern Clipboard API when available and include a fallback for compatible older environments.

## Source structure

| Path | Purpose |
|---|---|
| `app/page.tsx` | Main page content, probe data, and browser interactions |
| `app/globals.css` | Complete visual system, responsive layout, themes, and animations |
| `app/layout.tsx` | Document metadata and global page layout |
| `public/` | Static icons and favicon assets |
| `worker/index.ts` | Cloud-compatible worker entry point |
| `build/` | Sites/Vite integration code |
| `scripts/` | Installation, build, and artifact-validation helpers |
| `tests/` | Rendered HTML validation test |
| `package.json` | Project scripts and dependencies |
| `.openai/hosting.json` | Existing Sites project binding |

Generated dependencies, build output, caches, logs, and repository metadata are intentionally excluded from the ZIP file.

## Local setup

Requirements:

- Node.js 22.13 or later.
- npm.

From the extracted source directory:

```bash
npm ci
npm run dev
```

For the production build:

```bash
npm run build
```

Optional validation commands:

```bash
npm run lint
npm test
npm run validate:artifact
```

## Customization guidance

- Edit the experiment definitions and example code in `app/page.tsx`.
- Adjust colors, typography, spacing, and responsive breakpoints in `app/globals.css`.
- Update the page title and description in `app/layout.tsx`.
- Keep probe examples connected only to endpoints you are authorized to test.
- Replace generic `call_model(...)` pseudocode with an approved provider SDK call.
- Never place API keys, credentials, client data, or private logs directly in source files.

## Research report template

```markdown
# LLM Behavioral Assessment

## 1. Scope and authorization
- Model/service:
- Version or snapshot date:
- Approved endpoint and account:
- Rate, privacy, and data-retention constraints:

## 2. Hypothesis
If [independent variable] changes, then [observable signal] will change because [proposed mechanism].

## 3. Controls
- Fixed prompt elements:
- Fixed generation parameters:
- Repetitions per condition:
- Baseline condition:

## 4. Observations
| Run | Condition | Output signature | Tokens | Latency | Error/refusal |
|---:|---|---|---:|---:|---|
| 01 | baseline |  |  |  |  |

## 5. Inference
- Supported explanation:
- Competing explanations:
- Confidence: low / medium / high
- Evidence that would change this conclusion:

## 6. Limitations
State what the experiment cannot reveal, including exact weights, private training data, and undisclosed service-layer behavior.
```

## Final research rule

The strongest black-box assessment is not the one that makes the boldest claim. It is the one that keeps the system controlled, preserves raw evidence, tests alternative explanations, and clearly states what remains unknown.
