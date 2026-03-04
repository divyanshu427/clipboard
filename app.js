(() => {
  const STORAGE_KEY = "clipboard-boxes";

  const container = document.getElementById("boxes-container");
  const createBtn = document.getElementById("create-btn");
  const emptyState = document.getElementById("empty-state");
  const boxCount = document.getElementById("box-count");

  let boxes = loadBoxes();

  // ── Persistence ───────────────────────────

  function loadBoxes() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveBoxes() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boxes));
    updateCount();
    toggleEmptyState();
  }

  let saveTimer = null;
  function debouncedSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveBoxes, 300);
  }

  // ── UI Helpers ────────────────────────────

  function updateCount() {
    const n = boxes.length;
    boxCount.textContent = `${n} note${n !== 1 ? "s" : ""}`;
  }

  function toggleEmptyState() {
    emptyState.classList.toggle("hidden", boxes.length > 0);
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ── Auto-Resize ───────────────────────────

  function autoResize(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }

  // ── Build a Text Box DOM Element ──────────

  function createBoxElement(box) {
    const el = document.createElement("div");
    el.className = "text-box";
    el.dataset.id = box.id;

    el.innerHTML = `
      <div class="text-box-header">
        <div class="drag-handle">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="5" r="1.5"/>
            <circle cx="15" cy="5" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/>
            <circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="19" r="1.5"/>
            <circle cx="15" cy="19" r="1.5"/>
          </svg>
          <span class="box-label"></span>
        </div>
        <div class="text-box-actions">
          <button class="copy-btn" title="Copy to clipboard">
            <svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <svg class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:none">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
          <button class="minimize-btn" title="Minimize / Expand">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line class="min-icon" x1="5" y1="12" x2="19" y2="12"/>
              <g class="expand-icon" style="display:none">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </g>
            </svg>
          </button>
          <button class="delete-btn" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="text-box-body${box.minimized ? " collapsed" : ""}">
        <textarea placeholder="Type or paste something…" spellcheck="false">${escapeHtml(box.content)}</textarea>
      </div>
    `;

    updateMinimizeIcon(el, box.minimized);
    updateLabel(el, box);

    const textarea = el.querySelector("textarea");
    textarea.addEventListener("input", () => {
      autoResize(textarea);
      box.content = textarea.value;
      updateLabel(el, box);
      debouncedSave();
    });

    requestAnimationFrame(() => autoResize(textarea));

    el.querySelector(".copy-btn").addEventListener("click", () => {
      navigator.clipboard.writeText(box.content).then(() => {
        const copyIcon = el.querySelector(".copy-icon");
        const checkIcon = el.querySelector(".check-icon");
        copyIcon.style.display = "none";
        checkIcon.style.display = "";
        setTimeout(() => {
          copyIcon.style.display = "";
          checkIcon.style.display = "none";
        }, 1500);
      });
    });

    el.querySelector(".minimize-btn").addEventListener("click", () => {
      box.minimized = !box.minimized;
      el.querySelector(".text-box-body").classList.toggle("collapsed", box.minimized);
      updateMinimizeIcon(el, box.minimized);
      if (!box.minimized) {
        requestAnimationFrame(() => autoResize(textarea));
      }
      saveBoxes();
    });

    el.querySelector(".delete-btn").addEventListener("click", () => {
      el.style.transition = "opacity 0.2s ease, transform 0.2s ease";
      el.style.opacity = "0";
      el.style.transform = "translateX(30px)";
      setTimeout(() => {
        el.remove();
        boxes = boxes.filter((b) => b.id !== box.id);
        saveBoxes();
      }, 200);
    });

    return el;
  }

  function updateMinimizeIcon(el, minimized) {
    el.querySelector(".min-icon").style.display = minimized ? "none" : "";
    el.querySelector(".expand-icon").style.display = minimized ? "" : "none";
  }

  function updateLabel(el, box) {
    const label = el.querySelector(".box-label");
    if (box.content.trim()) {
      const preview = box.content.trim().split("\n")[0];
      label.textContent = preview.length > 32 ? preview.slice(0, 32) + "…" : preview;
    } else {
      label.textContent = "Empty note";
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Render All ────────────────────────────

  function renderAll() {
    container.innerHTML = "";
    boxes.forEach((box) => {
      container.appendChild(createBoxElement(box));
    });
    toggleEmptyState();
    updateCount();
  }

  // ── Create New Box ────────────────────────

  createBtn.addEventListener("click", () => {
    const box = { id: generateId(), content: "", minimized: false };
    boxes.push(box);
    const el = createBoxElement(box);
    container.appendChild(el);
    saveBoxes();

    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    requestAnimationFrame(() => {
      el.querySelector("textarea").focus();
    });
  });

  // ── Drag & Drop (SortableJS) ──────────────

  function initSortable() {
    new Sortable(container, {
      animation: 200,
      handle: ".text-box-header",
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      onEnd() {
        const orderedIds = [...container.children].map((el) => el.dataset.id);
        boxes.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
        saveBoxes();
      },
    });
  }

  // ── Keyboard Shortcut ─────────────────────

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "n") {
      e.preventDefault();
      createBtn.click();
    }
  });

  // ── Init ──────────────────────────────────

  renderAll();
  initSortable();
})();
