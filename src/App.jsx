import { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import "./App.css";

const STORAGE_KEY = "jobtrack-applications";
const STATUSES = ["Applied", "Assessment", "Interview", "Offer", "Rejected"];

const STATUS_COLORS = {
  Applied: "#5145e5",
  Assessment: "#f59e0b",
  Interview: "#0ea5e9",
  Offer: "#16a34a",
  Rejected: "#ef4444",
};

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (dateString, days) => {
  if (!dateString) return "";
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const daysBetween = (from, to = today()) => {
  if (!from) return 0;
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  return Math.floor((end - start) / 86400000);
};

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const emptyForm = () => ({
  company: "",
  role: "",
  date: today(),
  status: "Applied",
  link: "",
  notes: "",
  followUpDate: "",
  interviewDate: "",
  interviewRound: "",
  interviewNotes: "",
});

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const cleanApplication = (application) => ({
  id: application.id || makeId(),
  company: String(application.company ?? "").trim(),
  role: String(application.role ?? "").trim(),
  date: application.date || today(),
  status: STATUSES.includes(application.status)
    ? application.status
    : "Applied",
  link: String(application.link ?? "").trim(),
  notes: String(application.notes ?? "").trim(),
  followUpDate:
    application.followUpDate || addDays(application.date || today(), 7),
  interviewDate: application.interviewDate || "",
  interviewRound: application.interviewRound || "",
  interviewNotes: application.interviewNotes || "",
  lastUpdated: application.lastUpdated || application.date || today(),
});

const isDuplicate = (first, second) =>
  normalize(first.company) === normalize(second.company) &&
  normalize(first.role) === normalize(second.role) &&
  first.date === second.date;

const loadApplications = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];

      const cleaned = [];
      for (const item of parsed) {
        const application = cleanApplication(item);
        if (
          application.company &&
          application.role &&
          !cleaned.some((existing) => isDuplicate(existing, application))
        ) {
          cleaned.push(application);
        }
      }
      return cleaned;
    }

    // Sample data is used only the first time the app is opened.
    return [
      {
        id: makeId(),
        company: "Google",
        role: "Software Engineer Intern",
        date: addDays(today(), -6),
        status: "Offer",
        link: "",
        notes: "Review offer details.",
        followUpDate: "",
        interviewDate: "",
        interviewRound: "",
        interviewNotes: "",
      },
      {
        id: makeId(),
        company: "Amazon",
        role: "SDE Intern",
        date: addDays(today(), -5),
        status: "Assessment",
        link: "",
        notes: "Complete the online assessment.",
        followUpDate: "",
        interviewDate: "",
        interviewRound: "",
        interviewNotes: "",
      },
      {
        id: makeId(),
        company: "Microsoft",
        role: "SDE",
        date: addDays(today(), -2),
        status: "Applied",
        link: "",
        notes: "",
        followUpDate: "",
        interviewDate: "",
        interviewRound: "",
        interviewNotes: "",
      },
    ].map(cleanApplication);
  } catch (error) {
    console.error("Could not load JobTrack data:", error);
    return [];
  }
};

// CSV parser that supports quoted values and commas inside fields.
const parseCSV = (text) => {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim().toLowerCase());

  return rows.slice(1).map((values) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });
    return record;
  });
};

const csvEscape = (value) => {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
};

const formatDate = (dateString) => {
  if (!dateString) return "Not set";
  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const monthLabel = (year, monthIndex) =>
  new Date(year, monthIndex, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });

function App() {
  const [applications, setApplications] = useState(loadApplications);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");
  const [remindersOnly, setRemindersOnly] = useState(false);
  const [interviewsOnly, setInterviewsOnly] = useState(false);
  const [showAllApplications, setShowAllApplications] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    } catch (error) {
      console.error("Could not save JobTrack data:", error);
    }
  }, [applications]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const counts = useMemo(() => {
    const result = {
      total: applications.length,
      Applied: 0,
      Assessment: 0,
      Interview: 0,
      Offer: 0,
      Rejected: 0,
    };

    applications.forEach((application) => {
      if (result[application.status] !== undefined) {
        result[application.status] += 1;
      }
    });

    const total = result.total;
    const interviewAndOffer = result.Interview + result.Offer;

    return {
      ...result,
      interviewRate: total ? (interviewAndOffer / total) * 100 : 0,
      offerRate: total ? (result.Offer / total) * 100 : 0,
      assessmentRate: total ? (result.Assessment / total) * 100 : 0,
    };
  }, [applications]);

  const statusChartData = useMemo(
    () =>
      STATUSES.map((status) => ({
        name: status,
        value: counts[status],
        fill: STATUS_COLORS[status],
      })).filter((item) => item.value > 0),
    [counts],
  );

  const monthlyData = useMemo(() => {
    const current = new Date();
    const months = [];

    // Show the current month and the previous five months.
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(
        current.getFullYear(),
        current.getMonth() - offset,
        1,
      );

      const year = date.getFullYear();
      const month = date.getMonth();

      months.push({
        key: `${year}-${String(month + 1).padStart(2, "0")}`,
        month: monthLabel(year, month),
        applications: 0,
        interviews: 0,
        offers: 0,
      });
    }

    const byKey = Object.fromEntries(months.map((month) => [month.key, month]));

    applications.forEach((application) => {
      if (!application.date) return;

      const key = application.date.slice(0, 7);
      if (!byKey[key]) return;

      byKey[key].applications += 1;

      if (
        application.status === "Interview" ||
        application.status === "Offer"
      ) {
        byKey[key].interviews += 1;
      }

      if (application.status === "Offer") {
        byKey[key].offers += 1;
      }
    });

    return months;
  }, [applications]);

  const followUpReminders = useMemo(
    () =>
      applications
        .filter((application) => {
          if (
            !application.followUpDate ||
            ["Offer", "Rejected"].includes(application.status)
          ) {
            return false;
          }

          return application.followUpDate <= today();
        })
        .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate)),
    [applications],
  );

  const upcomingInterviews = useMemo(
    () =>
      applications
        .filter(
          (application) =>
            application.interviewDate &&
            application.interviewDate >= today() &&
            application.status !== "Rejected",
        )
        .sort((a, b) => a.interviewDate.localeCompare(b.interviewDate)),
    [applications],
  );

  const filteredApplications = useMemo(() => {
    let result = [...applications];

    if (search.trim()) {
      const query = normalize(search);
      result = result.filter((application) =>
        [
          application.company,
          application.role,
          application.notes,
          application.interviewNotes,
          application.interviewRound,
        ].some((value) => normalize(value).includes(query)),
      );
    }

    if (statusFilter !== "All") {
      result = result.filter(
        (application) => application.status === statusFilter,
      );
    }

    if (remindersOnly) {
      const reminderIds = new Set(
        followUpReminders.map((application) => application.id),
      );
      result = result.filter((application) => reminderIds.has(application.id));
    }

    if (interviewsOnly) {
      result = result.filter((application) =>
        Boolean(application.interviewDate),
      );
    }

    result.sort((a, b) => {
      if (sortBy === "oldest") return a.date.localeCompare(b.date);
      if (sortBy === "company-asc") {
        return a.company.localeCompare(b.company);
      }
      if (sortBy === "company-desc") {
        return b.company.localeCompare(a.company);
      }
      if (sortBy === "follow-up") {
        return (a.followUpDate || "9999").localeCompare(
          b.followUpDate || "9999",
        );
      }
      return b.date.localeCompare(a.date);
    });

    return result;
  }, [
    applications,
    search,
    statusFilter,
    sortBy,
    remindersOnly,
    interviewsOnly,
    followUpReminders,
  ]);

  const clearSpecialFilters = () => {
    setRemindersOnly(false);
    setInterviewsOnly(false);
  };

  const applyStatusFilter = (status) => {
    setStatusFilter(status);
    clearSpecialFilters();
    setShowAllApplications(true);
    document
      .getElementById("recent-applications")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handlePieClick = (entry) => {
    if (entry?.name) applyStatusFilter(entry.name);
  };

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => {
      const updated = { ...previous, [name]: value };

      if (name === "date" && !previous.followUpDate) {
        updated.followUpDate = addDays(value, 7);
      }

      if (name === "status" && value === "Interview") {
        // Keep interview fields as entered; do not overwrite them.
      }

      return updated;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const company = form.company.trim();
    const role = form.role.trim();

    if (!company || !role || !form.date) {
      setNotice("Please enter the company, role, and application date.");
      return;
    }

    if (form.link && !/^https?:\/\//i.test(form.link)) {
      setNotice("Job posting links must start with http:// or https://.");
      return;
    }

    const application = cleanApplication({
      ...form,
      id: editingId || makeId(),
      company,
      role,
      followUpDate: form.followUpDate || addDays(form.date, 7),
      lastUpdated: today(),
    });

    const duplicate = applications.some(
      (existing) =>
        existing.id !== editingId && isDuplicate(existing, application),
    );

    if (duplicate) {
      setNotice("This company, role, and application date already exist.");
      return;
    }

    if (editingId) {
      setApplications((previous) =>
        previous.map((item) => (item.id === editingId ? application : item)),
      );
      setNotice("Application updated successfully.");
    } else {
      setApplications((previous) => [application, ...previous]);
      setNotice("Application added successfully.");
    }

    resetForm();
  };

  const startEdit = (application) => {
    setForm({
      ...emptyForm(),
      ...application,
      followUpDate: application.followUpDate || addDays(application.date, 7),
    });
    setEditingId(application.id);
    setShowForm(true);
    clearSpecialFilters();

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteApplication = (id) => {
    const application = applications.find((item) => item.id === id);
    if (!application) return;

    const confirmed = window.confirm(
      `Delete the application for ${application.company} — ${application.role}?`,
    );

    if (!confirmed) return;

    setApplications((previous) => previous.filter((item) => item.id !== id));
    setNotice("Application deleted.");
  };

  const exportCSV = () => {
    const headers = [
      "company",
      "role",
      "date",
      "status",
      "link",
      "notes",
      "followUpDate",
      "interviewDate",
      "interviewRound",
      "interviewNotes",
      "lastUpdated",
    ];

    const rows = applications.map((application) =>
      headers.map((header) => csvEscape(application[header])),
    );

    const csv = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `jobtrack-applications-${today()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    setNotice("CSV exported successfully.");
  };

  const importCSV = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (!rows.length) {
        setNotice("The CSV is empty or has no data rows.");
        return;
      }

      const imported = rows
        .map((row) =>
          cleanApplication({
            company: row.company,
            role: row.role,
            date: row.date || today(),
            status: row.status || "Applied",
            link: row.link,
            notes: row.notes,
            followUpDate: row.followupdate,
            interviewDate: row.interviewdate,
            interviewRound: row.interviewround,
            interviewNotes: row.interviewnotes,
            lastUpdated: row.lastupdated,
          }),
        )
        .filter((item) => item.company && item.role);

      let added = 0;
      let skipped = 0;

      setApplications((previous) => {
        const next = [...previous];

        imported.forEach((item) => {
          const duplicate = next.some((existing) =>
            isDuplicate(existing, item),
          );

          if (duplicate) {
            skipped += 1;
          } else {
            next.push(item);
            added += 1;
          }
        });

        return next;
      });

      setNotice(
        `Import complete: ${added} added, ${skipped} duplicates skipped.`,
      );
    } catch (error) {
      console.error("CSV import failed:", error);
      setNotice("Could not import this CSV file.");
    } finally {
      event.target.value = "";
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setSortBy("newest");
    clearSpecialFilters();
    setShowAllApplications(false);
  };

  const addSampleData = () => {
    const samples = [
      {
        company: "Infosys",
        role: "Systems Engineer",
        date: today(),
        status: "Applied",
      },
      {
        company: "TCS",
        role: "Software Engineer",
        date: today(),
        status: "Applied",
      },
    ].map(cleanApplication);

    let added = 0;
    let skipped = 0;

    setApplications((previous) => {
      const next = [...previous];

      samples.forEach((sample) => {
        if (next.some((item) => isDuplicate(item, sample))) {
          skipped += 1;
        } else {
          next.push(sample);
          added += 1;
        }
      });

      return next;
    });

    setNotice(`Sample data: ${added} added, ${skipped} duplicates skipped.`);
  };

  const visibleApplications = showAllApplications
    ? filteredApplications
    : filteredApplications.slice(0, 10);

  const activeFilterLabel = remindersOnly
    ? "Follow-up reminders"
    : interviewsOnly
      ? "Interview tracker"
      : statusFilter !== "All"
        ? `${statusFilter} applications`
        : "All applications";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">J</div>
          <span>JobTrack</span>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <button
          className="nav-item active"
          onClick={() => {
            resetFilters();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span>▦</span> Dashboard
        </button>

        <button
          className="nav-item"
          onClick={() => {
            resetFilters();
            setShowAllApplications(true);
            document
              .getElementById("recent-applications")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <span>▤</span> All Applications
        </button>

        <button
          className="nav-item"
          onClick={() => {
            setRemindersOnly(true);
            setInterviewsOnly(false);
            setStatusFilter("All");
            setShowAllApplications(true);
            document
              .getElementById("recent-applications")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <span>◷</span> Follow-up Reminders
          {followUpReminders.length > 0 && (
            <span className="nav-count">{followUpReminders.length}</span>
          )}
        </button>

        <button
          className="nav-item"
          onClick={() => {
            setInterviewsOnly(true);
            setRemindersOnly(false);
            setStatusFilter("All");
            setShowAllApplications(true);
            document
              .getElementById("recent-applications")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <span>✓</span> Interview Tracker
        </button>

        <div className="sidebar-bottom">
          <div className="avatar">JT</div>
          <div>
            <strong>My Workspace</strong>
            <span>Job seeker</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">YOUR CAREER WORKSPACE</p>
            <h1>Dashboard</h1>
            <p className="page-subtitle">
              Track your applications and take the next step in your career.
            </p>
          </div>

          <div className="topbar-actions">
            <button className="button button-secondary" onClick={exportCSV}>
              ↓ Export CSV
            </button>
            <button
              className="button button-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              ↑ Import CSV
            </button>
            <button
              className="button button-primary"
              onClick={() => {
                setForm(emptyForm());
                setEditingId(null);
                setShowForm((previous) => !previous);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              + Add Application
            </button>
            <input
              ref={fileInputRef}
              className="visually-hidden"
              type="file"
              accept=".csv,text/csv"
              onChange={importCSV}
            />
          </div>
        </header>

        {notice && (
          <div className="toast" role="status">
            <span>{notice}</span>
            <button onClick={() => setNotice("")} aria-label="Dismiss message">
              ×
            </button>
          </div>
        )}

        {showForm && (
          <section className="panel form-panel" id="application-form">
            <div className="section-heading">
              <div>
                <h2>{editingId ? "Edit Application" : "Add Application"}</h2>
                <p>Keep your job search details in one place.</p>
              </div>
              <button
                className="icon-button"
                onClick={resetForm}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <label>
                  Company <span className="required">*</span>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    autoComplete="organization"
                    value={form.company}
                    onChange={handleChange}
                    placeholder="e.g. Google"
                    required
                  />
                </label>

                <label>
                  Job role <span className="required">*</span>
                  <input
                    id="role"
                    name="role"
                    type="text"
                    autoComplete="organization-title"
                    value={form.role}
                    onChange={handleChange}
                    placeholder="e.g. Software Engineer Intern"
                    required
                  />
                </label>

                <label>
                  Application date <span className="required">*</span>
                  <input
                    id="application-date"
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Current status
                  <select
                    id="status"
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Job posting link
                  <input
                    id="job-link"
                    type="url"
                    name="link"
                    value={form.link}
                    onChange={handleChange}
                    placeholder="https://..."
                  />
                </label>

                <label>
                  Follow-up date
                  <input
                    id="follow-up-date"
                    type="date"
                    name="followUpDate"
                    value={form.followUpDate}
                    onChange={handleChange}
                  />
                  <small>Defaults to 7 days after applying.</small>
                </label>

                <label>
                  Interview date
                  <input
                    id="interview-date"
                    type="date"
                    name="interviewDate"
                    value={form.interviewDate}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Interview round
                  <input
                    id="interview-round"
                    name="interviewRound"
                    value={form.interviewRound}
                    onChange={handleChange}
                    placeholder="e.g. Technical Round 1"
                  />
                </label>

                <label className="full-width">
                  Application notes
                  <textarea
                    id="application-notes"
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Recruiter details, next steps, or other notes..."
                    rows="3"
                  />
                </label>

                <label className="full-width">
                  Interview preparation notes
                  <textarea
                    id="interview-notes"
                    name="interviewNotes"
                    value={form.interviewNotes}
                    onChange={handleChange}
                    placeholder="Topics to revise, questions to practise, feedback..."
                    rows="3"
                  />
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={resetForm}
                >
                  Cancel
                </button>
                <button type="submit" className="button button-primary">
                  {editingId ? "Save Changes" : "Save Application"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="stats-grid" aria-label="Application statistics">
          <button
            className="stat-card"
            onClick={() => applyStatusFilter("All")}
          >
            <div className="stat-top">
              <span className="stat-label">Total Applications</span>
              <span className="stat-icon purple">▤</span>
            </div>
            <strong className="stat-number">{counts.total}</strong>
            <span className="stat-caption">All saved applications</span>
          </button>

          <button
            className="stat-card"
            onClick={() => applyStatusFilter("Applied")}
          >
            <div className="stat-top">
              <span className="stat-label">Applied</span>
              <span className="stat-icon blue">↗</span>
            </div>
            <strong className="stat-number">{counts.Applied}</strong>
            <span className="stat-caption">Waiting for a response</span>
          </button>

          <button
            className="stat-card"
            onClick={() => applyStatusFilter("Assessment")}
          >
            <div className="stat-top">
              <span className="stat-label">Assessments</span>
              <span className="stat-icon orange">✎</span>
            </div>
            <strong className="stat-number">{counts.Assessment}</strong>
            <span className="stat-caption">Tests and assignments</span>
          </button>

          <button
            className="stat-card"
            onClick={() => applyStatusFilter("Interview")}
          >
            <div className="stat-top">
              <span className="stat-label">Interviews</span>
              <span className="stat-icon cyan">◉</span>
            </div>
            <strong className="stat-number">{counts.Interview}</strong>
            <span className="stat-caption">Interview-stage applications</span>
          </button>

          <button
            className="stat-card"
            onClick={() => applyStatusFilter("Offer")}
          >
            <div className="stat-top">
              <span className="stat-label">Offers</span>
              <span className="stat-icon green">✓</span>
            </div>
            <strong className="stat-number">{counts.Offer}</strong>
            <span className="stat-caption">Offers received</span>
          </button>
        </section>

        <section className="rate-grid">
          <div className="rate-card">
            <span>Interview rate</span>
            <strong>{counts.interviewRate.toFixed(1)}%</strong>
            <p>Interview-stage applications and offers ÷ total applications</p>
          </div>
          <div className="rate-card">
            <span>Offer rate</span>
            <strong>{counts.offerRate.toFixed(1)}%</strong>
            <p>Offers received ÷ total applications</p>
          </div>
          <div className="rate-card">
            <span>Assessment rate</span>
            <strong>{counts.assessmentRate.toFixed(1)}%</strong>
            <p>Assessment-stage applications ÷ total applications</p>
          </div>
        </section>

        <button
          className="rejected-summary"
          onClick={() => applyStatusFilter("Rejected")}
        >
          <span className="rejected-left">
            <span className="rejected-dot" />
            <span>
              Rejected applications: <strong>{counts.Rejected}</strong>
            </span>
          </span>
          <span className="text-button">View rejected →</span>
        </button>

        <section className="charts-grid">
          <div className="panel chart-panel">
            <div className="section-heading">
              <div>
                <h2>Application Overview</h2>
                <p>Click a chart segment to filter applications by status.</p>
              </div>
              <span className="count-pill">{counts.total} applications</span>
            </div>

            {statusChartData.length > 0 ? (
              <div className="pie-chart-wrap">
                <ResponsiveContainer width="100%" height={330}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="46%"
                      outerRadius={105}
                      paddingAngle={2}
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine
                      onClick={handlePieClick}
                      style={{ cursor: "pointer" }}
                    >
                      {statusChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-chart">
                <span>◔</span>
                <strong>No application data yet</strong>
                <p>Add an application to see your chart.</p>
              </div>
            )}
          </div>

          <div className="panel chart-panel">
            <div className="section-heading">
              <div>
                <h2>Monthly Activity</h2>
                <p>Applications submitted during the last six months.</p>
              </div>
              <span className="count-pill">6 months</span>
            </div>

            <div className="bar-chart-wrap">
              <ResponsiveContainer width="100%" height={330}>
                <BarChart
                  data={monthlyData}
                  margin={{ top: 10, right: 8, left: -18, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="applications"
                    name="Applications"
                    fill="#5145e5"
                    radius={[5, 5, 0, 0]}
                  />
                  <Bar
                    dataKey="interviews"
                    name="Interviews / offers"
                    fill="#0ea5e9"
                    radius={[5, 5, 0, 0]}
                  />
                  <Bar
                    dataKey="offers"
                    name="Offers"
                    fill="#16a34a"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="two-column-grid">
          <div className="panel reminder-panel">
            <div className="section-heading">
              <div>
                <h2>Follow-up Reminders</h2>
                <p>Applications with a follow-up date today or earlier.</p>
              </div>
              <span className="count-pill warning-pill">
                {followUpReminders.length} due
              </span>
            </div>

            {followUpReminders.length === 0 ? (
              <div className="empty-state compact-empty">
                <span>✓</span>
                <strong>You're up to date!</strong>
                <p>No follow-up reminders are due.</p>
              </div>
            ) : (
              <div className="mini-list">
                {followUpReminders.slice(0, 5).map((application) => (
                  <div className="mini-item" key={application.id}>
                    <div className="company-avatar">
                      {application.company.charAt(0).toUpperCase()}
                    </div>
                    <div className="mini-item-content">
                      <strong>{application.company}</strong>
                      <span>{application.role}</span>
                      <small>
                        Follow-up: {formatDate(application.followUpDate)}
                        {application.followUpDate < today() &&
                          ` · ${daysBetween(application.followUpDate)} days overdue`}
                      </small>
                    </div>
                    <button
                      className="small-button"
                      onClick={() => startEdit(application)}
                    >
                      Update
                    </button>
                  </div>
                ))}
                {followUpReminders.length > 5 && (
                  <button
                    className="inline-link"
                    onClick={() => {
                      setRemindersOnly(true);
                      setInterviewsOnly(false);
                      setStatusFilter("All");
                      setShowAllApplications(true);
                      document
                        .getElementById("recent-applications")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    View all {followUpReminders.length} reminders →
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="panel interview-panel">
            <div className="section-heading">
              <div>
                <h2>Upcoming Interviews</h2>
                <p>Prepare for interviews scheduled in your tracker.</p>
              </div>
              <span className="count-pill info-pill">
                {upcomingInterviews.length} scheduled
              </span>
            </div>

            {upcomingInterviews.length === 0 ? (
              <div className="empty-state compact-empty">
                <span>◷</span>
                <strong>No upcoming interviews</strong>
                <p>Add an interview date to an application to track it here.</p>
              </div>
            ) : (
              <div className="mini-list">
                {upcomingInterviews.slice(0, 5).map((application) => (
                  <div className="mini-item" key={application.id}>
                    <div className="company-avatar interview-avatar">
                      {application.company.charAt(0).toUpperCase()}
                    </div>
                    <div className="mini-item-content">
                      <strong>{application.company}</strong>
                      <span>{application.role}</span>
                      <small>
                        {formatDate(application.interviewDate)}
                        {application.interviewRound &&
                          ` · ${application.interviewRound}`}
                      </small>
                    </div>
                    <button
                      className="small-button"
                      onClick={() => startEdit(application)}
                    >
                      Prepare
                    </button>
                  </div>
                ))}
                {upcomingInterviews.length > 5 && (
                  <button
                    className="inline-link"
                    onClick={() => {
                      setInterviewsOnly(true);
                      setRemindersOnly(false);
                      setStatusFilter("All");
                      setShowAllApplications(true);
                      document
                        .getElementById("recent-applications")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    View all interviews →
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="panel applications-panel" id="recent-applications">
          <div className="section-heading applications-heading">
            <div>
              <h2>Recent Applications</h2>
              <p>Manage and review your job applications.</p>
            </div>
            <span className="count-pill">
              {filteredApplications.length}{" "}
              {filteredApplications.length === 1 ? "record" : "records"}
            </span>
          </div>
          {(remindersOnly || interviewsOnly || statusFilter !== "All") && (
            <div className="active-filter-banner">
              Showing: <strong>{activeFilterLabel}</strong>
              <button className="inline-link" onClick={resetFilters}>
                Clear filter
              </button>
            </div>
          )}

          <div className="table-controls">
            {/* Search input */}
            <input
              id="search-applications"
              name="search"
              className="search-input"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search company, role, or notes..."
              aria-label="Search applications"
              autoComplete="off"
            />

            {/* Status filter */}
            <select
              id="status-filter"
              name="statusFilter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>

              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            {/* Sorting dropdown */}
            <select
              id="sort-applications"
              name="sortApplications"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              aria-label="Sort applications"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="company-asc">Company A–Z</option>
              <option value="company-desc">Company Z–A</option>
              <option value="follow-up">Follow-up date</option>
            </select>
          </div>
          {filteredApplications.length === 0 ? (
            <div className="empty-state table-empty">
              <span>⌕</span>
              <strong>No applications found</strong>
              <p>Try changing your search or filters, or add an application.</p>
              <button
                className="button button-secondary"
                onClick={resetFilters}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>COMPANY & ROLE</th>
                      <th>APPLIED</th>
                      <th>STATUS</th>
                      <th>FOLLOW-UP</th>
                      <th>INTERVIEW</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleApplications.map((application) => {
                      const due =
                        application.followUpDate &&
                        application.followUpDate <= today() &&
                        !["Offer", "Rejected"].includes(application.status);

                      return (
                        <tr key={application.id}>
                          <td>
                            <div className="company-cell">
                              <div className="company-avatar">
                                {application.company.charAt(0).toUpperCase()}
                              </div>
                              <div className="company-details">
                                <strong>{application.company}</strong>
                                <span>{application.role}</span>

                                {application.link && (
                                  <a
                                    className="job-link"
                                    href={application.link}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    View job posting ↗
                                  </a>
                                )}

                                {application.notes && (
                                  <p className="table-note">
                                    {application.notes}
                                  </p>
                                )}

                                {application.interviewNotes && (
                                  <p className="table-note">
                                    <strong>Interview notes:</strong>{" "}
                                    {application.interviewNotes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td>{formatDate(application.date)}</td>

                          <td>
                            <button
                              className={`status-badge status-${application.status.toLowerCase()}`}
                              onClick={() =>
                                applyStatusFilter(application.status)
                              }
                              title={`Filter by ${application.status}`}
                            >
                              {application.status}
                            </button>
                          </td>

                          <td>
                            <span className={due ? "due-date" : "normal-date"}>
                              {formatDate(application.followUpDate)}
                            </span>
                            {due && (
                              <small className="due-label">Follow up</small>
                            )}
                          </td>

                          <td>
                            {application.interviewDate ? (
                              <div className="interview-cell">
                                <strong>
                                  {formatDate(application.interviewDate)}
                                </strong>
                                <span>
                                  {application.interviewRound || "Interview"}
                                </span>
                              </div>
                            ) : (
                              <span className="muted">Not scheduled</span>
                            )}
                          </td>

                          <td>
                            <div className="action-buttons">
                              <button
                                className="small-button"
                                onClick={() => startEdit(application)}
                              >
                                Edit
                              </button>
                              <button
                                className="small-button danger-button"
                                onClick={() =>
                                  deleteApplication(application.id)
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredApplications.length > 10 && (
                <button
                  className="show-more-button"
                  onClick={() =>
                    setShowAllApplications((previous) => !previous)
                  }
                >
                  {showAllApplications
                    ? "Show fewer applications"
                    : `Show all ${filteredApplications.length} applications`}
                </button>
              )}
            </>
          )}
        </section>

        <section className="data-tools">
          <div>
            <strong>Keep your records safe</strong>
            <p>
              Export a CSV backup before moving to another browser or computer.
            </p>
          </div>
          <div className="data-tool-actions">
            <button className="button button-secondary" onClick={exportCSV}>
              Export backup
            </button>
            <button className="button button-secondary" onClick={addSampleData}>
              Add sample records
            </button>
          </div>
        </section>

        <footer className="footer">
          <span>JobTrack</span> · Built to organize your career journey
          <span className="footer-dot">•</span>
          Your data is saved in this browser
        </footer>
      </main>
    </div>
  );
}

export default App;
