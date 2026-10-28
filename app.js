 // Chuyển giữa Trang chủ và Thống kê học tập mà không tải lại trang.
    const pageNavButtons = document.querySelectorAll(".page-nav-btn");
    const appPages = document.querySelectorAll(".app-page");
    pageNavButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const targetPageId = button.dataset.page;
        appPages.forEach((page) => {
          const isTarget = page.id === targetPageId;
          page.hidden = !isTarget;
          page.classList.toggle("active", isTarget);
        });
        pageNavButtons.forEach((item) => {
          const isActive = item === button;
          item.classList.toggle("active", isActive);
          if (isActive) item.setAttribute("aria-current", "page");
          else item.removeAttribute("aria-current");
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    // Giữ nguyên khóa lưu trữ của phiên bản trước.
    const STORAGE_KEY = "studyTasks";
    const THEME_KEY = "studyTheme";

    const taskForm = document.getElementById("task-form");
    const nameInput = document.getElementById("task-name");
    const subjectInput = document.getElementById("task-subject");
    const deadlineInput = document.getElementById("task-deadline");
    const searchInput = document.getElementById("task-search");
    const sortSelect = document.getElementById("task-sort");
    const taskList = document.getElementById("task-list");
    const themeToggle = document.getElementById("theme-toggle");
    const toast = document.getElementById("toast");

    let tasks = loadTasks();
    let currentFilter = "all";
    let toastTimeout;

    function loadTasks() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : [];

        if (!Array.isArray(parsed)) return [];

        return parsed
          .filter(task => task && typeof task === "object")
          .map(task => ({
            ...task,
            subject: task.subject || "",
            completed: Boolean(task.completed)
          }));
      } catch (error) {
        console.error("Không thể đọc danh sách bài tập:", error);
        return [];
      }
    }

    function saveTasks() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
      } catch (error) {
        console.error("Không thể lưu danh sách bài tập:", error);
        showToast("Không lưu được dữ liệu. Hãy kiểm tra trình duyệt.");
        return false;
      }
    }

    function showToast(message) {
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(toastTimeout);

      toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
      }, 2300);
    }

    function localDateString(date = new Date()) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function updateDate() {
      document.getElementById("current-date").textContent =
        new Intl.DateTimeFormat("vi-VN", {
          weekday: "long",
          day: "numeric",
          month: "long"
        }).format(new Date());
    }

    function updateStats() {
      const completed = tasks.filter(task => task.completed).length;
      const total = tasks.length;
      const remaining = total - completed;
      const percent = total ? Math.round(completed / total * 100) : 0;

      document.getElementById("total-tasks").textContent = total;
      document.getElementById("completed-tasks").textContent = completed;
      document.getElementById("remaining-tasks").textContent = remaining;
      document.getElementById("progress-percent").textContent = percent + "%";
      document.getElementById("progress-bar").style.width = percent + "%";
      document.getElementById("progress-count").textContent =
        `${completed}/${total} bài`;

      let message = "Bắt đầu từ một nhiệm vụ nhỏ";

      if (total > 0 && percent === 100) {
        message = "Tuyệt vời! Em đã hoàn thành tất cả!";
      } else if (percent >= 60) {
        message = "Em đang làm rất tốt!";
      } else if (completed > 0) {
        message = "Cứ tiếp tục phát huy nhé!";
      }

      document.getElementById("progress-message").textContent = message;
    }

    function makeTag(text, extraClass = "") {
      const tag = document.createElement("span");
      tag.className = ("tag " + extraClass).trim();
      tag.textContent = text;
      return tag;
    }

    function getDeadlineInfo(deadline, completed) {
      if (completed) {
        return { text: "Đã hoàn thành", className: "done" };
      }

      if (!deadline) return null;

      const today = localDateString();

      if (deadline < today) {
        return { text: "Quá hạn · " + deadline, className: "overdue" };
      }

      if (deadline === today) {
        return { text: "Hạn hôm nay", className: "today" };
      }

      return { text: "Hạn: " + deadline, className: "" };
    }

    function renderTasks() {
      taskList.replaceChildren();

      const keyword = searchInput.value.trim().toLocaleLowerCase("vi");

      const visibleTasks = tasks.filter(task => {
        const name = String(task.name || "").toLocaleLowerCase("vi");
        const subject = String(task.subject || "").toLocaleLowerCase("vi");

        const matchesSearch =
          name.includes(keyword) || subject.includes(keyword);

        const matchesFilter =
          currentFilter === "all" ||
          (currentFilter === "active" && !task.completed) ||
          (currentFilter === "completed" && task.completed);

        return matchesSearch && matchesFilter;
      });
            const sortMode = sortSelect.value;

      visibleTasks.sort((a, b) => {
        // Đưa nhiệm vụ đã hoàn thành xuống cuối
        if (sortMode === "completed-bottom") {
          return Number(a.completed) - Number(b.completed);
        }

        // Sắp xếp nhiệm vụ mới nhất lên trước
        if (sortMode === "newest") {
          return Number(b.id) - Number(a.id);
        }

        // Sắp xếp theo hạn gần nhất
        const deadlineA = a.deadline || "";
        const deadlineB = b.deadline || "";

        if (!deadlineA && !deadlineB) return 0;
        if (!deadlineA) return 1;
        if (!deadlineB) return -1;

        return deadlineA.localeCompare(deadlineB);
      });

      if (visibleTasks.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";

        const icon = document.createElement("div");
        icon.className = "empty-icon";
        icon.textContent = keyword ? "⌕" : "📝";

        const title = document.createElement("div");
        title.textContent = keyword
          ? "Không tìm thấy nhiệm vụ phù hợp"
          : tasks.length === 0
            ? "Chưa có nhiệm vụ nào"
            : "Không có nhiệm vụ trong mục này";

        const hint = document.createElement("div");
        hint.textContent = keyword
          ? "Thử từ khóa khác nhé."
          : "Thêm bài tập đầu tiên để bắt đầu.";

        empty.append(icon, title, hint);
        taskList.append(empty);
        return;
      }

      visibleTasks.forEach(task => {
        const item = document.createElement("article");
        item.className = "task-item" + (task.completed ? " completed" : "");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-check";
        checkbox.checked = task.completed;
        checkbox.setAttribute("aria-label", "Đánh dấu hoàn thành");

        checkbox.addEventListener("change", () => {
          const target = tasks.find(t => t.id === task.id);
          if (!target) return;

          const previous = target.completed;
          target.completed = checkbox.checked;

          if (!saveTasks()) {
            target.completed = previous;
            renderAll();
            return;
          }

          renderAll();
          showToast(target.completed
            ? "Đã hoàn thành nhiệm vụ!"
            : "Đã cập nhật nhiệm vụ");
        });

        const content = document.createElement("div");
        content.className = "task-content";
        const pomodoroBadge = document.createElement("span");
pomodoroBadge.className = "tag pomodoro-badge";
pomodoroBadge.textContent = `🍅 × ${task.pomodoroCount || 0}`;
pomodoroBadge.title = "Số phiên Pomodoro đã hoàn thành";

        const title = document.createElement("div");
title.className = "task-name";
title.textContent = task.name || "Nhiệm vụ chưa có tên";
title.title = "Nhấp đúp để sửa tên bài tập";

title.addEventListener("dblclick", () => {
  if (title.querySelector("input")) return;

  const oldName = task.name || "";
  const editor = document.createElement("input");

  editor.type = "text";
  editor.className = "field";
  editor.value = oldName;
  editor.setAttribute("aria-label", "Sửa tên bài tập");

  title.replaceChildren(editor);
  editor.focus();
  editor.select();

  let cancelled = false;

  function finishEditing() {
    if (cancelled) return;

    const newName = editor.value.trim();

    if (!newName) {
      task.name = oldName;
    } else {
      task.name = newName;
    }

    if (!saveTasks()) {
      task.name = oldName;
      showToast("Không thể lưu thay đổi. Hãy thử lại nhé.");
    }

    renderAll();
  }

  editor.addEventListener("blur", finishEditing);

  editor.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      editor.blur();
    }

    if (event.key === "Escape") {
      cancelled = true;
      task.name = oldName;
      renderAll();
    }
  });
});
        content.append(title);

        const meta = document.createElement("div");
        meta.className = "task-meta";

        if (task.subject) {
          meta.append(makeTag("📘 " + task.subject));
        }

        const deadlineInfo = getDeadlineInfo(task.deadline, task.completed);

        if (deadlineInfo) {
          meta.append(makeTag(deadlineInfo.text, deadlineInfo.className));
        } else if (!task.completed) {
          meta.append(makeTag("Chưa đặt hạn"));
        }

        content.append(meta);
        meta.append(pomodoroBadge);
const studyButton = document.createElement("button");
studyButton.type = "button";
studyButton.className = "study-now-btn";
studyButton.textContent = "▶ Học ngay";
studyButton.title = "Bắt đầu Pomodoro cho nhiệm vụ này";

studyButton.addEventListener("click", () => {
  startPomodoroForTask(task.id);
});
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "×";
        deleteButton.title = "Xóa nhiệm vụ";
        deleteButton.setAttribute(
          "aria-label",
          "Xóa " + (task.name || "nhiệm vụ")
        );

        deleteButton.addEventListener("click", () => {
          const confirmed = confirm(
            `Em có chắc muốn xóa "${task.name}" không?`
          );

          if (!confirmed) return;

          const oldTasks = tasks;
          tasks = tasks.filter(t => t.id !== task.id);

          if (!saveTasks()) {
            tasks = oldTasks;
            renderAll();
            return;
          }

          renderAll();
          showToast("Đã xóa nhiệm vụ");
        });

item.append(checkbox, content, studyButton, deleteButton); 
       taskList.append(item);
      });
    }

    function renderAll() {
      updateStats();
      renderTasks();
    }

    taskForm.addEventListener("submit", event => {
      event.preventDefault();

      const name = nameInput.value.trim();

      if (!name) {
        showToast("Em hãy nhập tên nhiệm vụ nhé.");
        nameInput.focus();
        return;
      }

      const newTask = {
  id: Date.now() + Math.random(),
  name,
  deadline: deadlineInput.value,
  subject: subjectInput.value,
  completed: false,
  pomodoroCount: 0
};

      tasks.unshift(newTask);

      if (!saveTasks()) {
        tasks.shift();
        return;
      }

      taskForm.reset();
      renderAll();
      showToast("Đã thêm nhiệm vụ mới!");
      nameInput.focus();
    });

    searchInput.addEventListener("input", renderTasks);
    // Phím tắt: / để tìm kiếm, Space để điều khiển Pomodoro
document.addEventListener("keydown", (event) => {
  const target = event.target;

  const isTyping =
    target instanceof HTMLElement &&
    (
      target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
    );

  // Không kích hoạt phím tắt khi đang nhập nội dung
  if (isTyping || event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  // Nhấn / để chuyển đến ô tìm kiếm
  if (event.key === "/") {
    event.preventDefault();
    searchInput.focus();
  }

  // Nhấn Space để bắt đầu hoặc tạm dừng Pomodoro
  if (
    event.code === "Space" &&
    !["BUTTON", "A"].includes(target.tagName)
  ) {
    event.preventDefault();
    timerStart.click();
  }
});
    sortSelect.addEventListener("change", renderTasks);

    document.querySelectorAll(".filter-btn").forEach(button => {
      button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;

        document.querySelectorAll(".filter-btn").forEach(btn => {
          btn.classList.toggle("active", btn === button);
        });

        renderTasks();
      });
    });

    // Chế độ sáng/tối: tiếp tục dùng khóa studyTheme.
    function applyTheme(theme) {
      document.body.classList.toggle("dark", theme === "dark");
      themeToggle.textContent =
        theme === "dark" ? "☀️ Chế độ sáng" : "🌙 Chế độ tối";
    }

    try {
  const savedTheme = localStorage.getItem(THEME_KEY);

  if (savedTheme === "light" || savedTheme === "dark") {
    // Ưu tiên giao diện người dùng đã chọn trước đó
    applyTheme(savedTheme);
  } else {
    // Lần đầu mở trang: theo giao diện của hệ thống
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    applyTheme(prefersDark ? "dark" : "light");
  }
} catch (error) {
  const prefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches;

  applyTheme(prefersDark ? "dark" : "light");
}

    themeToggle.addEventListener("click", () => {
      const nextTheme = document.body.classList.contains("dark")
        ? "light"
        : "dark";

      applyTheme(nextTheme);

      try {
        localStorage.setItem(THEME_KEY, nextTheme);
      } catch (error) {
        showToast("Không thể lưu tùy chọn giao diện.");
      }
    });
// Nhiệm vụ đang được học bằng Pomodoro
let currentStudyTaskId = null;

function startPomodoroForTask(taskId) {
  const task = tasks.find(item => item.id === taskId);

  if (!task) {
    showToast("Không tìm thấy nhiệm vụ này.");
    return;
  }

  currentStudyTaskId = taskId;

  // Chuyển sang phiên tập trung 25 phút
  const focusButton = Array.from(timerModeButtons).find(
    button => button.dataset.minutes === "25"
  );

  if (focusButton && timerDuration !== 25 * 60) {
    focusButton.click();
  }

  // Nếu đồng hồ chưa chạy thì bắt đầu
  if (!isRunning) {
    timerStart.click();
  }

  timerStatus.textContent = `Đang học: ${task.name}`;
  showToast(`Bắt đầu học: ${task.name}`);
}
    // Pomodoro timer.
    const timerDisplay = document.getElementById("pomodoro-time");
    const timerStatus = document.getElementById("pomodoro-status");
    const timerStart = document.getElementById("pomodoro-start");
    const timerReset = document.getElementById("pomodoro-reset");
    const timerModeButtons = document.querySelectorAll(".timer-mode");

    let timerDuration = 25 * 60;
    let secondsLeft = timerDuration;
    let timerInterval = null;
    let timerEndAt = null;
    let isRunning = false;

    function updateTimerDisplay() {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const timeText =
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0");

  timerDisplay.textContent = timeText;
  timerStart.textContent = isRunning
    ? "Ⅱ Tạm dừng"
    : "▶ Bắt đầu";

  // Chỉ cập nhật tiêu đề tab khi thời gian thay đổi
  const newTitle = isRunning ? `${timeText} · StudyTask` : "StudyTask";

  if (document.title !== newTitle) {
    document.title = newTitle;
  }
}

    function stopTimer() {
      clearInterval(timerInterval);
      timerInterval = null;
      isRunning = false;
      timerEndAt = null;
      updateTimerDisplay();
    }
function playTimerSound() {
  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.15;

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.onended = () => {
      audio.close();
    };

    const playSound = () => {
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.3);
    };

    if (audio.state === "suspended") {
      audio.resume().then(playSound).catch(() => audio.close());
    } else {
      playSound();
    }
  } catch (error) {
    console.warn("Không thể phát âm báo Pomodoro:", error);
  }
}
    function tickTimer() {
  if (!isRunning || timerEndAt === null) return;

  secondsLeft = Math.max(
    0,
    Math.ceil((timerEndAt - Date.now()) / 1000)
  );

  if (secondsLeft <= 0) {
    const wasFocusSession = timerDuration === 25 * 60;
    let hadTask = false;

    // Chỉ ghi nhận khi hoàn thành phiên tập trung
    if (wasFocusSession) {
      const completedAt = new Date();

      recordStudySession(25, currentStudyTaskId);

      // Tăng số phiên cho nhiệm vụ đang học (nếu có)
      const task = currentStudyTaskId !== null
        ? tasks.find(item => item.id === currentStudyTaskId)
        : null;

      if (task) {
        task.pomodoroCount = (task.pomodoroCount || 0) + 1;
        saveTasks();
        renderAll();
        showToast(`Đã hoàn thành 1 phiên học: ${task.name} 🍅`);
      }
      hadTask = Boolean(task);
      currentStudyTaskId = null; // phiên sau không bị gán nhầm vào bài cũ
    }

    stopTimer();
    secondsLeft = 0;
    playTimerSound();

    // Tập trung xong thì nghỉ 5 phút; nghỉ xong thì tập trung 25 phút
    const nextMinutes = wasFocusSession ? "5" : "25";

    const nextModeButton = Array.from(timerModeButtons).find(
      button => button.dataset.minutes === nextMinutes
    );

    if (nextModeButton) {
      nextModeButton.click();

      timerStatus.textContent = wasFocusSession
        ? "Đã hết giờ tập trung! Đến lúc nghỉ 5 phút."
        : "Đã hết giờ nghỉ! Sẵn sàng tập trung 25 phút.";

      if (!wasFocusSession || !hadTask) {
        showToast(
          wasFocusSession
            ? "Hết giờ tập trung! Bắt đầu nghỉ nhé."
            : "Hết giờ nghỉ! Quay lại học thôi."
        );
      }
    } else {
      timerStatus.textContent =
        "Đã hết giờ! Hãy chọn phiên Pomodoro tiếp theo.";
      showToast("Đã hết giờ Pomodoro!");
    }
  }

  updateTimerDisplay();
}

    timerStart.addEventListener("click", () => {
      if (isRunning) {
        secondsLeft = Math.max(
          0,
          Math.ceil((timerEndAt - Date.now()) / 1000)
        );

        stopTimer();
        timerStatus.textContent = "Đã tạm dừng";
        return;
      }

      if (secondsLeft <= 0) {
        secondsLeft = timerDuration;
      }

      isRunning = true;
      timerEndAt = Date.now() + secondsLeft * 1000;
      timerStatus.textContent = "Đang tập trung. Em làm được mà!";
      updateTimerDisplay();
      timerInterval = setInterval(tickTimer, 250);
    });

    timerReset.addEventListener("click", () => {
      stopTimer();
      secondsLeft = timerDuration;
      timerStatus.textContent = "Đã đặt lại bộ đếm";
      updateTimerDisplay();
    });

    timerModeButtons.forEach(button => {
      button.addEventListener("click", () => {
        stopTimer();

        timerModeButtons.forEach(btn => {
          btn.classList.toggle("active", btn === button);
        });

        timerDuration = Number(button.dataset.minutes) * 60;
        secondsLeft = timerDuration;

        timerStatus.textContent =
          timerDuration === 25 * 60
            ? "Sẵn sàng cho một phiên tập trung"
            : "Thư giãn một chút nhé";

        updateTimerDisplay();
      });
    });
    updateDate();
    renderAll();
    updateTimerDisplay();