(() => {
  "use strict";

  const lines = (items) => items.join("\n");

  const researchBrief = lines([
    "LLM BLACK-BOX RESEARCH BRIEF",
    "",
    "Objective: Characterize observable model behavior without accessing or extracting proprietary internals.",
    "Authorization: Confirm API access, testing scope, rate limits, and data-handling rules.",
    "Independent variable: Change one prompt or generation parameter at a time.",
    "Controls: Fix model version, seed (when available), temperature, top_p, and prompt format.",
    "Measurements: Output, latency, token usage, refusals, formatting, consistency, and error behavior.",
    "Validation: Repeat trials, compare against alternative explanations, and report confidence levels.",
    "Boundary: Do not attempt credential theft, safeguard bypass, hidden-prompt extraction, weight theft, or terms-of-service violations.",
  ]);

  const reportTemplate = lines([
    "# LLM Behavioral Assessment",
    "",
    "## 1. Scope and authorization",
    "- Model/service:",
    "- Version or snapshot date:",
    "- Approved endpoint and account:",
    "- Rate, privacy, and data-retention constraints:",
    "",
    "## 2. Hypothesis",
    "If [independent variable] changes, then [observable signal] will change because [proposed mechanism].",
    "",
    "## 3. Controls",
    "- Fixed prompt elements:",
    "- Fixed generation parameters:",
    "- Repetitions per condition:",
    "- Baseline condition:",
    "",
    "## 4. Observations",
    "| Run | Condition | Output signature | Tokens | Latency | Error/refusal |",
    "|---:|---|---|---:|---:|---|",
    "| 01 | baseline |  |  |  |  |",
    "",
    "## 5. Inference",
    "- Supported explanation:",
    "- Competing explanations:",
    "- Confidence: low / medium / high",
    "- Evidence that would change this conclusion:",
    "",
    "## 6. Limitations",
    "State what the experiment cannot reveal, including exact weights, private training data, and undisclosed service-layer behavior.",
  ]);

  const probes = {
    tokenizer: {
      index: "P-01",
      label: "Tokenizer",
      title: "Estimate tokenization behavior",
      summary: "Compare reported token usage across carefully chosen strings to identify segmentation patterns and likely tokenizer families.",
      hypothesis: "Strings with spaces, punctuation, Unicode, code, and uncommon compounds will produce stable relative token-count signatures.",
      method: [
        "Use only the provider's documented usage field.",
        "Keep all generation settings fixed.",
        "Test short paired strings that differ by one feature.",
        "Repeat after model-version changes.",
      ],
      signal: "Relative token-count changes across paired samples; unusually expensive characters; stable word-boundary patterns.",
      caveat: "Billing counts may include wrappers or differ from the model tokenizer, so treat family identification as probabilistic.",
      code: lines([
        "# Replace call_model with an authorized SDK call.",
        "samples = [",
        "    \"hello world\",",
        "    \"hello  world\",       # doubled space",
        "    \"Hello, world!\",      # case + punctuation",
        "    \"cybersecurity\",",
        "    \"cyber-security\",",
        "    \"नमस्ते दुनिया\",       # Unicode sample",
        "    \"def probe(x): return x + 1\",",
        "]",
        "",
        "for text in samples:",
        "    response = call_model(",
        "        prompt=text,",
        "        temperature=0,",
        "        max_output_tokens=1,",
        "    )",
        "    print({",
        "        \"sample\": text,",
        "        \"input_tokens\": response.usage.input_tokens,",
        "    })",
      ]),
    },
    context: {
      index: "P-02",
      label: "Context",
      title: "Map effective context behavior",
      summary: "Place benign landmarks at controlled positions, increase input size gradually, and measure retrieval accuracy and failure shape.",
      hypothesis: "Past an effective boundary, landmark recall will degrade, truncate, or change abruptly—even before a documented hard limit.",
      method: [
        "Use synthetic text you own.",
        "Move the landmark across positions.",
        "Vary length geometrically, then narrow the boundary.",
        "Separate API rejection from model recall failure.",
      ],
      signal: "Hard request errors, position-sensitive recall, recency bias, or gradual accuracy loss before the maximum accepted input.",
      caveat: "A service may summarize, truncate, route, or retrieve context. Observed capacity is not proof of a specific attention architecture.",
      code: lines([
        "MARKER = \"COBALT-731\"",
        "",
        "def context_probe(repetitions: int):",
        "    filler = \"alpha beta gamma delta \" * repetitions",
        "    prompt = f\"\"\"",
        "Remember this marker: {MARKER}",
        "",
        "{filler}",
        "",
        "Return only the marker stated at the beginning.",
        "\"\"\"",
        "    return call_model(",
        "        prompt=prompt,",
        "        temperature=0,",
        "        max_output_tokens=12,",
        "    )",
        "",
        "for size in [100, 250, 500, 1000, 2000, 4000]:",
        "    result = context_probe(size)",
        "    print(size, MARKER in result.text, result.finish_reason)",
      ]),
    },
    sampling: {
      index: "P-03",
      label: "Sampling",
      title: "Measure decoding signatures",
      summary: "Repeat the same benign prompt under documented generation controls and quantify variation rather than judging a few outputs by eye.",
      hypothesis: "Higher temperature or broader nucleus sampling will increase lexical and structural diversity while reducing run-to-run agreement.",
      method: [
        "Use at least 20 trials per condition.",
        "Change one parameter at a time.",
        "Record any provider-supplied seed.",
        "Compare distributions, not single examples.",
      ],
      signal: "Unique-output ratio, pairwise similarity, length variance, format adherence, and deterministic replay when seeds are supported.",
      caveat: "Server-side routing, model updates, hidden defaults, and nondeterministic kernels can produce variation even at temperature zero.",
      code: lines([
        "from collections import Counter",
        "",
        "prompt = \"Give a three-word title for a report about ocean sensors.\"",
        "",
        "for temperature in [0.0, 0.3, 0.7, 1.0]:",
        "    outputs = []",
        "    for _ in range(20):",
        "        r = call_model(",
        "            prompt=prompt,",
        "            temperature=temperature,",
        "            max_output_tokens=12,",
        "        )",
        "        outputs.append(r.text.strip())",
        "",
        "    counts = Counter(outputs)",
        "    print({",
        "        \"temperature\": temperature,",
        "        \"unique_ratio\": len(counts) / len(outputs),",
        "        \"most_common\": counts.most_common(3),",
        "    })",
      ]),
    },
    hierarchy: {
      index: "P-04",
      label: "Instruction layers",
      title: "Characterize instruction handling",
      summary: "Use harmless conflicts to observe how the service resolves message roles, formatting requirements, refusals, and policy boundaries.",
      hypothesis: "Documented higher-priority instructions will remain stable when lower-priority text asks for a conflicting—but harmless—format.",
      method: [
        "Use benign content only.",
        "Never ask for hidden prompts or secrets.",
        "Test role and delimiter changes separately.",
        "Record refusal wording and format compliance.",
      ],
      signal: "Consistent priority resolution, stable policy language, wrapper-dependent behavior, or changes caused by conversation history.",
      caveat: "The service stack may add moderation, routing, or templating outside the model. Do not attribute every behavior to model weights.",
      code: lines([
        "cases = [",
        "    {",
        "        \"name\": \"baseline\",",
        "        \"messages\": [",
        "            {\"role\": \"user\", \"content\": \"Return the word BLUE.\"}",
        "        ],",
        "    },",
        "    {",
        "        \"name\": \"benign conflict\",",
        "        \"messages\": [",
        "            {\"role\": \"system\", \"content\": \"Answer with one uppercase word.\"},",
        "            {\"role\": \"user\", \"content\": \"Return blue in lowercase.\"},",
        "        ],",
        "    },",
        "]",
        "",
        "for case in cases:",
        "    r = call_model(messages=case[\"messages\"], temperature=0)",
        "    print(case[\"name\"], repr(r.text), r.finish_reason)",
      ]),
    },
    tools: {
      index: "P-05",
      label: "Tool use",
      title: "Test tool-selection reliability",
      summary: "Present safe mock tools and score whether the model selects the right function, produces valid arguments, and recovers from tool errors.",
      hypothesis: "Clear schema descriptions and constrained enums will improve tool choice and argument validity under ambiguous requests.",
      method: [
        "Use sandboxed, side-effect-free tools.",
        "Test no-tool, one-tool, and ambiguous cases.",
        "Inject controlled tool errors.",
        "Score selection and schema validity separately.",
      ],
      signal: "Correct-call rate, JSON validity, unnecessary-call rate, argument repair, and final-answer grounding in returned tool data.",
      caveat: "Do not connect experiments to production actions. Model quality, SDK parsing, and orchestration logic all affect the observed result.",
      code: lines([
        "tools = [{",
        "    \"name\": \"lookup_weather_demo\",",
        "    \"description\": \"Return fictional weather from a local test fixture.\",",
        "    \"parameters\": {",
        "        \"type\": \"object\",",
        "        \"properties\": {",
        "            \"city\": {\"type\": \"string\"},",
        "            \"unit\": {\"type\": \"string\", \"enum\": [\"C\", \"F\"]},",
        "        },",
        "        \"required\": [\"city\", \"unit\"],",
        "    },",
        "}]",
        "",
        "tests = [",
        "    \"What is 2 + 2?\",",
        "    \"Demo weather for Pune in C\",",
        "    \"Is the demo warmer in Pune or Goa?\",",
        "]",
        "",
        "for prompt in tests:",
        "    r = call_model(prompt=prompt, tools=tools, tool_mode=\"auto\")",
        "    print(prompt, r.tool_calls)",
      ]),
    },
  };

  const checklistItems = [
    "I have written authorization and a defined endpoint.",
    "My prompts use synthetic or approved data only.",
    "Each experiment changes one independent variable.",
    "I record model version, parameters, time, and raw output.",
    "I repeat trials and test at least one competing explanation.",
    "My report separates observations, inference, and limitations.",
  ];

  const storage = {
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Storage can be unavailable in private or restricted browser contexts.
      }
    },
  };

  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Copy command was unavailable.");
  }

  const toast = document.getElementById("toast");
  let toastTimer;

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2600);
  }

  async function copyWithFeedback(text, button, copiedLabel, idleLabel) {
    const label = button.querySelector(".copy-label");
    try {
      await copyText(text);
      label.textContent = copiedLabel;
      showToast("Copied to clipboard");
      window.setTimeout(() => {
        label.textContent = idleLabel;
      }, 3500);
    } catch {
      showToast("Copy failed — select the text manually");
    }
  }

  const themeToggle = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");
  const themeLabel = document.getElementById("themeLabel");
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  function applyTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.dataset.theme = theme;
    themeIcon.textContent = isDark ? "☼" : "◐";
    themeLabel.textContent = isDark ? "LIGHT" : "DARK";
    themeToggle.setAttribute("aria-label", "Switch to " + (isDark ? "light" : "dark") + " theme");
    themeMeta.setAttribute("content", isDark ? "#090b0b" : "#f2f4ef");
  }

  let currentTheme = storage.get("llm-lab-theme") === "light" ? "light" : "dark";
  applyTheme(currentTheme);

  themeToggle.addEventListener("click", () => {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    storage.set("llm-lab-theme", currentTheme);
    applyTheme(currentTheme);
  });

  const tabsRoot = document.getElementById("probeTabs");
  const probePanel = document.getElementById("probePanel");
  const probeKicker = document.getElementById("probeKicker");
  const probeTitle = document.getElementById("probeTitle");
  const probeSummary = document.getElementById("probeSummary");
  const hypothesisText = document.getElementById("hypothesisText");
  const methodList = document.getElementById("methodList");
  const signalText = document.getElementById("signalText");
  const caveatText = document.getElementById("caveatText");
  const codeFilename = document.getElementById("codeFilename");
  const probeCode = document.getElementById("probeCode");
  const copyCode = document.getElementById("copyCode");
  const probeKeys = Object.keys(probes);
  let activeProbe = "tokenizer";

  function renderTabs() {
    tabsRoot.replaceChildren();
    probeKeys.forEach((key, index) => {
      const probe = probes[key];
      const button = document.createElement("button");
      const indexLabel = document.createElement("span");
      indexLabel.textContent = probe.index;
      button.type = "button";
      button.id = "tab-" + key;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", "probePanel");
      button.setAttribute("aria-selected", String(key === activeProbe));
      button.tabIndex = key === activeProbe ? 0 : -1;
      button.dataset.probe = key;
      button.append(indexLabel, document.createTextNode(probe.label));
      button.addEventListener("click", () => renderProbe(key, true));
      button.addEventListener("keydown", (event) => {
        let nextIndex = index;
        if (event.key === "ArrowRight") nextIndex = (index + 1) % probeKeys.length;
        else if (event.key === "ArrowLeft") nextIndex = (index - 1 + probeKeys.length) % probeKeys.length;
        else if (event.key === "Home") nextIndex = 0;
        else if (event.key === "End") nextIndex = probeKeys.length - 1;
        else return;
        event.preventDefault();
        renderProbe(probeKeys[nextIndex], true);
        document.getElementById("tab-" + probeKeys[nextIndex]).focus();
      });
      tabsRoot.appendChild(button);
    });
  }

  function renderProbe(key, refreshTabs) {
    activeProbe = key;
    const probe = probes[key];
    probePanel.setAttribute("aria-labelledby", "tab-" + key);
    probeKicker.textContent = probe.index + " / CONTROLLED PROBE";
    probeTitle.textContent = probe.title;
    probeSummary.textContent = probe.summary;
    hypothesisText.textContent = probe.hypothesis;
    signalText.textContent = probe.signal;
    caveatText.textContent = probe.caveat;
    codeFilename.textContent = "probe_" + key + ".py";
    probeCode.textContent = probe.code;
    methodList.replaceChildren();
    probe.method.forEach((method) => {
      const item = document.createElement("li");
      item.textContent = method;
      methodList.appendChild(item);
    });
    if (refreshTabs) renderTabs();
  }

  copyCode.addEventListener("click", () => {
    copyWithFeedback(probes[activeProbe].code, copyCode, "COPIED", "COPY CODE");
  });

  const reportTemplateElement = document.getElementById("reportTemplate");
  const copyTemplate = document.getElementById("copyTemplate");
  reportTemplateElement.textContent = reportTemplate;
  copyTemplate.addEventListener("click", () => {
    copyWithFeedback(reportTemplate, copyTemplate, "COPIED", "COPY TEMPLATE");
  });

  const copyBrief = document.getElementById("copyBrief");
  copyBrief.addEventListener("click", () => {
    copyWithFeedback(researchBrief, copyBrief, "Brief copied", "Copy research brief");
  });

  const checkItemsRoot = document.getElementById("checkItems");
  const progressText = document.getElementById("progressText");
  const progressTrack = document.getElementById("progressTrack");
  const progressBar = document.getElementById("progressBar");
  const resetChecklist = document.getElementById("resetChecklist");
  let checked = checklistItems.map(() => false);

  const savedChecklist = storage.get("llm-lab-checklist");
  if (savedChecklist) {
    try {
      const parsed = JSON.parse(savedChecklist);
      if (Array.isArray(parsed) && parsed.length === checklistItems.length && parsed.every((value) => typeof value === "boolean")) {
        checked = parsed;
      }
    } catch {
      checked = checklistItems.map(() => false);
    }
  }

  function updateProgress() {
    const completed = checked.filter(Boolean).length;
    const progress = Math.round((completed / checklistItems.length) * 100);
    progressText.textContent = String(progress).padStart(2, "0") + "%";
    progressBar.style.width = progress + "%";
    progressTrack.setAttribute("aria-valuenow", String(progress));
    resetChecklist.disabled = completed === 0;
  }

  function renderChecklist() {
    checkItemsRoot.replaceChildren();
    checklistItems.forEach((item, index) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      const customCheck = document.createElement("span");
      const text = document.createElement("span");

      input.type = "checkbox";
      input.checked = checked[index];
      customCheck.className = "custom-check";
      customCheck.setAttribute("aria-hidden", "true");
      customCheck.textContent = checked[index] ? "✓" : "";
      text.textContent = item;
      if (checked[index]) label.classList.add("checked");

      input.addEventListener("change", () => {
        checked[index] = input.checked;
        storage.set("llm-lab-checklist", JSON.stringify(checked));
        renderChecklist();
      });

      label.append(input, customCheck, text);
      checkItemsRoot.appendChild(label);
    });
    updateProgress();
  }

  resetChecklist.addEventListener("click", () => {
    checked = checklistItems.map(() => false);
    storage.set("llm-lab-checklist", JSON.stringify(checked));
    renderChecklist();
  });

  renderTabs();
  renderProbe(activeProbe, false);
  renderChecklist();
})();
