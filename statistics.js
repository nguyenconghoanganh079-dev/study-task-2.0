 // Theo dõi thời gian học: dùng khóa riêng, không đụng đến studyTasks.
    const STUDY_LOG_KEY = "studyTaskStudyLogs";
    const studyEntryForm = document.getElementById("study-entry-form");
    const studyEntryDate = document.getElementById("study-entry-date");
    const studyEntryMinutes = document.getElementById("study-entry-minutes");
    const studyChart = document.getElementById("study-chart");
    const studyChartEmpty = document.getElementById("study-chart-empty");
    const studyChartGrid = document.getElementById("study-chart-grid");
    const studyChartArea = document.getElementById("study-chart-area");
    const studyChartLine = document.getElementById("study-chart-line");
    const studyChartPoints = document.getElementById("study-chart-points");
    const studyChartLabels = document.getElementById("study-chart-labels");
    const studyHistory = document.getElementById("study-history");

    function loadStudyLogs() {
      try {
        const raw = localStorage.getItem(STUDY_LOG_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(item =>
          item &&
          typeof item.date === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
          Number.isFinite(Number(item.minutes)) &&
          Number(item.minutes) > 0
        ).map(item => ({
          id: String(item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
          date: item.date,
          minutes: Math.min(1440, Math.round(Number(item.minutes)))
        }));
      } catch (error) {
        console.error("Không thể đọc lịch sử học tập:", error);
        return [];
      }
    }

    let studyLogs = loadStudyLogs();

    // Gán id cố định cho các bản ghi cũ (từ Pomodoro) để xóa được đúng bản ghi.
    try { localStorage.setItem(STUDY_LOG_KEY, JSON.stringify(studyLogs)); } catch (e) {}

    // app.js gọi hàm này khi một phiên Pomodoro kết thúc.
    function recordStudySession(minutes, taskId = null) {
      studyLogs.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date: localDateString(),
        minutes,
        taskId,
        completedAt: new Date().toISOString()
      });
      saveStudyLogs();
      renderStudyChart();
    }

    function saveStudyLogs() {
      try {
        localStorage.setItem(STUDY_LOG_KEY, JSON.stringify(studyLogs));
        return true;
      } catch (error) {
        console.error("Không thể lưu lịch sử học tập:", error);
        showToast("Không lưu được lịch sử học tập. Hãy kiểm tra trình duyệt.");
        return false;
      }
    }

    function getLastSevenDates() {
      const dates = [];
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      for (let offset = 6; offset >= 0; offset--) {
        const date = new Date(today);
        date.setDate(today.getDate() - offset);
        dates.push(localDateString(date));
      }
      return dates;
    }

    function formatStudyDate(dateString, options = { day: "numeric", month: "numeric" }) {
      const [year, month, day] = dateString.split("-").map(Number);
      return new Intl.DateTimeFormat("vi-VN", options).format(new Date(year, month - 1, day, 12));
    }

    function getMinutesByDate(dateString) {
      return studyLogs
        .filter(log => log.date === dateString)
        .reduce((sum, log) => sum + log.minutes, 0);
    }

    function formatStudyDuration(minutes) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (hours && remainingMinutes) return `${hours} giờ ${remainingMinutes} phút`;
      if (hours) return `${hours} giờ`;
      return `${remainingMinutes} phút`;
    }

    function renderStudyChart() {
      const dates = getLastSevenDates();
      const values = dates.map(getMinutesByDate);
      const total = values.reduce((sum, value) => sum + value, 0);
      const daysWithStudy = values.filter(value => value > 0).length;
      const hasData = total > 0;

      document.getElementById("study-week-total").textContent = formatStudyDuration(total);
      document.getElementById("study-days-count").textContent = `${daysWithStudy}/7 ngày`;
      // SVG không có thuộc tính .hidden như thẻ HTML, nên phải dùng toggleAttribute
      studyChart.toggleAttribute("hidden", !hasData);
      studyChartEmpty.hidden = hasData;

      studyChartGrid.replaceChildren();
      studyChartPoints.replaceChildren();
      studyChartLabels.replaceChildren();
      studyChartLine.setAttribute("d", "");
      studyChartArea.setAttribute("d", "");

      if (hasData) {
        const NS = "http://www.w3.org/2000/svg";
        const left = 42, right = 680, top = 22, bottom = 190;
        const maxValue = Math.max(60, Math.ceil(Math.max(...values) / 60) * 60);
        const yMaxHours = Math.max(1, Math.ceil(maxValue / 60));
        const plotHeight = bottom - top;
        const xStep = (right - left) / 6;
        const yFor = minutes => bottom - (minutes / (yMaxHours * 60)) * plotHeight;

        for (let hour = 0; hour <= yMaxHours; hour++) {
          const y = yFor(hour * 60);
          const line = document.createElementNS(NS, "line");
          line.setAttribute("x1", left);
          line.setAttribute("x2", right);
          line.setAttribute("y1", y);
          line.setAttribute("y2", y);
          line.setAttribute("class", "chart-grid-line");
          studyChartGrid.append(line);

          const label = document.createElementNS(NS, "text");
          label.setAttribute("x", left - 9);
          label.setAttribute("y", y + 4);
          label.setAttribute("text-anchor", "end");
          label.setAttribute("class", "chart-axis-label");
          label.textContent = hour === 0 ? "0" : `${hour}h`;
          studyChartGrid.append(label);
        }

        const points = values.map((value, index) => ({
          x: left + xStep * index,
          y: yFor(value),
          value,
          date: dates[index]
        }));
        const linePath = points.map((point, index) =>
          `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
        ).join(" ");
        studyChartLine.setAttribute("d", linePath);
        studyChartArea.setAttribute(
          "d",
          `${linePath} L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z`
        );

        points.forEach(point => {
          const circle = document.createElementNS(NS, "circle");
          circle.setAttribute("cx", point.x);
          circle.setAttribute("cy", point.y);
          circle.setAttribute("r", point.value > 0 ? 5 : 3);
          circle.setAttribute("class", "chart-point");
          const title = document.createElementNS(NS, "title");
          title.textContent = `${formatStudyDate(point.date)}: ${formatStudyDuration(point.value)}`;
          circle.append(title);
          studyChartPoints.append(circle);

          const label = document.createElementNS(NS, "text");
          label.setAttribute("x", point.x);
          label.setAttribute("y", 220);
          label.setAttribute("text-anchor", "middle");
          label.setAttribute("class", "chart-axis-label");
          label.textContent = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][
            new Date(point.date + "T12:00:00").getDay()
          ];
          studyChartLabels.append(label);
        });
      }

      renderStudyHistory();
    }

    function renderStudyHistory() {
      studyHistory.replaceChildren();
      const recentLogs = [...studyLogs]
        .sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)))
        .slice(0, 5);

      if (recentLogs.length === 0) return;

      const heading = document.createElement("div");
      heading.className = "muted";
      heading.style.fontSize = "12px";
      heading.style.fontWeight = "700";
      heading.textContent = "Lịch sử ghi nhận gần đây";
      studyHistory.append(heading);

      recentLogs.forEach(log => {
        const item = document.createElement("div");
        item.className = "study-history-item";

        const info = document.createElement("div");
        const date = document.createElement("strong");
        date.textContent = formatStudyDate(log.date, { weekday: "short", day: "numeric", month: "short" });
        const note = document.createElement("small");
        note.textContent = "Phiên học đã ghi nhận";
        info.append(date, note);

        const right = document.createElement("div");
        right.style.display = "flex";
        right.style.alignItems = "center";
        right.style.gap = "8px";

        const duration = document.createElement("strong");
        duration.textContent = formatStudyDuration(log.minutes);

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "delete-btn";
        remove.textContent = "×";
        remove.title = "Xóa lần ghi nhận này";
        remove.setAttribute("aria-label", "Xóa lần ghi nhận học tập");
        remove.addEventListener("click", () => {
          const previousLogs = studyLogs;
          studyLogs = studyLogs.filter(entry => entry.id !== log.id);
          if (!saveStudyLogs()) {
            studyLogs = previousLogs;
            return;
          }
          renderStudyChart();
          showToast("Đã xóa lần ghi nhận học tập.");
        });

        right.append(duration, remove);
        item.append(info, right);
        studyHistory.append(item);
      });
    }

    studyEntryDate.value = localDateString();
    studyEntryDate.max = localDateString();

    studyEntryForm.addEventListener("submit", event => {
      event.preventDefault();
      const date = studyEntryDate.value;
      const minutes = Number(studyEntryMinutes.value);
      const today = localDateString();

      if (!date || date > today) {
        showToast("Em hãy chọn hôm nay hoặc một ngày đã qua nhé.");
        return;
      }
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
        showToast("Số phút học phải từ 1 đến 1440.");
        studyEntryMinutes.focus();
        return;
      }

      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date,
        minutes
      };
      studyLogs.push(entry);

      if (!saveStudyLogs()) {
        studyLogs = studyLogs.filter(log => log.id !== entry.id);
        return;
      }

      studyEntryMinutes.value = "";
      renderStudyChart();
      showToast("Đã ghi nhận thời gian học!");
    });
    renderStudyChart();