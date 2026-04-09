/**
 * AdminDashboard — shared logic for IELTS and Cambridge admin dashboards.
 * Created by ADR-021 to eliminate ~90% duplication between the two pages.
 *
 * Each dashboard creates an instance with an exam-specific config object,
 * then overrides only the hooks that differ (filters, table rendering,
 * score display, answer comparison, answer management, CSV export, etc.).
 */

/* exported AdminDashboard */
class AdminDashboard {
    /**
     * @param {object} config
     * @param {string} config.apiBase          – e.g. 'http://localhost:3002'
     * @param {string} config.tokenKey         – localStorage key for auth token
     * @param {string} config.examType         – 'ielts' | 'cambridge'
     * @param {string} config.healthEndpoint   – e.g. '/test'
     * @param {string} config.submissionsEndpoint – e.g. '/submissions'
     * @param {string} config.answersEndpoint  – e.g. '/mock-answers'
     * @param {string} config.csvFilenamePrefix – e.g. 'test_submissions'
     * @param {string} config.dateViewDefaultColor – button color when not in date view
     * @param {string} config.serverHint       – e.g. 'node local-database-server.js'
     * @param {string[]} [config.extraFilterIds] – additional filter element IDs to clear
     * @param {string[]} [config.extraLogoutHideIds] – additional element IDs to hide on logout
     * @param {string[]} [config.extraLoginShowIds]  – additional element IDs to show on login
     */
    constructor(config) {
        this.apiBase = config.apiBase;
        this.tokenKey = config.tokenKey;
        this.examType = config.examType;
        this.healthEndpoint = config.healthEndpoint || '/test';
        this.submissionsEndpoint = config.submissionsEndpoint;
        this.answersEndpoint = config.answersEndpoint;
        this.csvFilenamePrefix = config.csvFilenamePrefix || 'submissions';
        this.dateViewDefaultColor = config.dateViewDefaultColor || '#667eea';
        this.serverHint = config.serverHint || 'node local-database-server.js';
        this.extraFilterIds = config.extraFilterIds || [];
        this.extraLogoutHideIds = config.extraLogoutHideIds || [];
        this.extraLoginShowIds = config.extraLoginShowIds || [];

        // State
        this.authToken = localStorage.getItem(this.tokenKey);
        this.currentSubmissions = [];
        this.filteredSubmissions = [];
        this.correctAnswers = {};
        this.currentPage = 1;
        this.itemsPerPage = 15;
        this.totalPages = 0;
        this.isDateGroupView = false;

        // Scoring queue state
        this.scoringQueueIndex = -1;

        // Expose on window so inline onclick handlers work
        this._exposeGlobals();
    }

    // ------------------------------------------------------------------
    // Bootstrap
    // ------------------------------------------------------------------

    /** Call once the DOM is ready. */
    init() {
        this.checkDatabaseConnection();
        this.initKeyboardShortcuts();
        if (this.authToken) {
            this.showAdminPanel();
        }
    }

    // ------------------------------------------------------------------
    // Authenticated fetch helper — sends admin token with every request
    // ------------------------------------------------------------------

    _authFetch(url, options = {}) {
        if (!options.headers) options.headers = {};
        if (this.authToken) {
            options.headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        return fetch(url, options);
    }

    // ------------------------------------------------------------------
    // Utility helpers (pure)
    // ------------------------------------------------------------------

    static escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    // ------------------------------------------------------------------
    // Anti-cheat helpers — read flags from anti_cheat_data column
    // ------------------------------------------------------------------

    static parseAntiCheat(submission) {
        if (!submission) return null;
        const ac = submission.anti_cheat_data || submission.antiCheatData || null;
        if (!ac) return null;
        if (typeof ac === 'string') {
            try { return JSON.parse(ac); } catch (e) { return null; }
        }
        return (typeof ac === 'object') ? ac : null;
    }

    static hasAntiCheatViolations(submission) {
        const ac = AdminDashboard.parseAntiCheat(submission);
        if (!ac) return false;
        if (ac.scoreTamper) return true;
        if (ac.durationFlag) return true;
        if ((ac.tabSwitches || 0) > 0) return true;
        if ((ac.windowBlurs || 0) > 0) return true;
        if ((ac.fullscreenExits || 0) > 0) return true;
        if ((ac.copyAttempts || 0) > 0) return true;
        if ((ac.pasteAttempts || 0) > 0) return true;
        if (ac.distractionFreeEnabled === false) return true;
        return false;
    }

    /** Compact inline flag for table rows. Returns empty string if no violations. */
    static renderAntiCheatBadge(submission) {
        if (!AdminDashboard.hasAntiCheatViolations(submission)) return '';
        const ac = AdminDashboard.parseAntiCheat(submission);
        const reasons = [];
        if (ac.scoreTamper) reasons.push('Score tampered');
        if (ac.durationFlag) reasons.push('Overtime');
        if ((ac.tabSwitches || 0) > 0) reasons.push(ac.tabSwitches + ' tab\u00A0switch' + (ac.tabSwitches > 1 ? 'es' : ''));
        if ((ac.fullscreenExits || 0) > 0) reasons.push(ac.fullscreenExits + ' fs\u00A0exit' + (ac.fullscreenExits > 1 ? 's' : ''));
        if ((ac.windowBlurs || 0) > 0) reasons.push(ac.windowBlurs + ' blur');
        if ((ac.copyAttempts || 0) > 0) reasons.push(ac.copyAttempts + ' copy');
        if ((ac.pasteAttempts || 0) > 0) reasons.push(ac.pasteAttempts + ' paste');
        if (ac.distractionFreeEnabled === false) reasons.push('No FS');
        const title = AdminDashboard.escapeHtml(reasons.join(', '));
        return '<span class="ac-flag-badge" title="' + title + '">\u26A0 Flagged</span>';
    }

    /** Detailed block for the scoring modal — full violation breakdown. */
    static renderAntiCheatDetail(submission) {
        const ac = AdminDashboard.parseAntiCheat(submission);
        if (!ac) return '';
        const rows = [];
        if (ac.scoreTamper) {
            const detail = (ac.clientScore != null && ac.serverScore != null)
                ? 'client=' + ac.clientScore + ', server=' + ac.serverScore
                : (ac.clientBandScore != null ? 'client band=' + ac.clientBandScore : 'client value rejected');
            rows.push(['Score tampering', detail, true]);
        }
        if (ac.durationFlag) rows.push(['Time limit', 'Exceeded 2x the allowed duration', true]);
        if ((ac.tabSwitches || 0) > 0) rows.push(['Tab switches', ac.tabSwitches, false]);
        if ((ac.fullscreenExits || 0) > 0) rows.push(['Fullscreen exits', ac.fullscreenExits, false]);
        if ((ac.windowBlurs || 0) > 0) rows.push(['Window blurs', ac.windowBlurs, false]);
        if ((ac.copyAttempts || 0) > 0) rows.push(['Copy attempts (blocked)', ac.copyAttempts, false]);
        if ((ac.pasteAttempts || 0) > 0) rows.push(['Paste attempts (blocked)', ac.pasteAttempts, false]);
        if ((ac.rightClickAttempts || 0) > 0) rows.push(['Right-click attempts', ac.rightClickAttempts, false]);
        if ((ac.blockedShortcuts || 0) > 0) rows.push(['Blocked shortcuts', ac.blockedShortcuts, false]);
        if (ac.distractionFreeEnabled === false) rows.push(['Distraction-free mode', 'Disabled', true]);
        if (ac.firstViolationAt) rows.push(['First violation', new Date(ac.firstViolationAt).toLocaleString(), false]);
        if (ac.lastViolationAt) rows.push(['Last violation', new Date(ac.lastViolationAt).toLocaleString(), false]);

        if (rows.length === 0) return '';

        const esc = AdminDashboard.escapeHtml;
        const rowHtml = rows.map(r => {
            const cls = r[2] ? 'ac-detail-row ac-critical' : 'ac-detail-row';
            return '<div class="' + cls + '"><span class="ac-label">' + esc(r[0]) + '</span><span class="ac-value">' + esc(r[1]) + '</span></div>';
        }).join('');

        return '<div class="anti-cheat-detail-block">' +
               '<div class="anti-cheat-detail-title">\u26A0 Anti-Cheat Flags</div>' +
               '<div class="anti-cheat-detail-note">Consider these signals when scoring this submission.</div>' +
               rowHtml +
               '</div>';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    calculateDuration(startTime, endTime) {
        if (!startTime || !endTime) return 'N/A';
        const start = new Date(startTime);
        const end = new Date(endTime);
        const minutes = Math.round((end - start) / (1000 * 60));
        return `${minutes}m`;
    }

    /** Organize a flat array of submissions into { [dateKey]: { displayDate, submissions[] } }. */
    getSubmissionsByDate(submissions) {
        const submissionsByDate = {};
        submissions.forEach(submission => {
            const submissionDate = new Date(submission.created_at);
            const dateKey = submissionDate.toISOString().split('T')[0];
            const displayDate = submissionDate.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            if (!submissionsByDate[dateKey]) {
                submissionsByDate[dateKey] = { displayDate, submissions: [] };
            }
            submissionsByDate[dateKey].submissions.push(submission);
        });
        return submissionsByDate;
    }

    // ------------------------------------------------------------------
    // Connection
    // ------------------------------------------------------------------

    async checkDatabaseConnection() {
        try {
            const response = await fetch(`${this.apiBase}${this.healthEndpoint}`);
            if (response.ok) {
                document.getElementById('connectionStatus').textContent = 'Database Online';
                document.getElementById('connectionStatus').className = 'connection-status connected';
            } else {
                throw new Error('Database not responding');
            }
        } catch (_error) {
            document.getElementById('connectionStatus').textContent = 'Database Offline';
            document.getElementById('connectionStatus').className = 'connection-status disconnected';
        }
    }

    // ------------------------------------------------------------------
    // Authentication
    // ------------------------------------------------------------------

    async login(event) {
        event.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('loginBtn');
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');

        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';

        try {
            const response = await fetch('/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const result = await response.json();
            if (result.success) {
                localStorage.setItem(this.tokenKey, result.token);
                this.authToken = result.token;
                successMessage.textContent = 'Login successful!';
                successMessage.style.display = 'block';
                setTimeout(() => this.showAdminPanel(), 1000);
            } else {
                errorMessage.textContent = 'Invalid credentials.';
                errorMessage.style.display = 'block';
            }
        } catch (_err) {
            errorMessage.textContent = 'Server unavailable. Please ensure the server is running.';
            errorMessage.style.display = 'block';
        }

        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    }

    showAdminPanel() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'block';

        // Show any exam-specific elements
        this.extraLoginShowIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'flex';
        });

        // Set default date range (last 30 days)
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        document.getElementById('dateTo').value = today.toISOString().split('T')[0];
        document.getElementById('dateFrom').value = thirtyDaysAgo.toISOString().split('T')[0];

        // Hook for subclass-specific setup (e.g. answer management init)
        this.onAdminPanelReady();

        this.loadSubmissions();
    }

    /** Override in each dashboard for exam-specific post-login work. */
    onAdminPanelReady() {
        // default: initialize answer management + load correct answers
        this.initializeAnswerManagement();
        this.loadCorrectAnswers();
    }

    logout() {
        localStorage.removeItem(this.tokenKey);
        this.authToken = null;
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('adminContent').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'none';
        this.extraLogoutHideIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        document.getElementById('username').value = 'admin';
        document.getElementById('password').value = '';
    }

    // ------------------------------------------------------------------
    // Submissions loading (override loadSubmissions if response differs)
    // ------------------------------------------------------------------

    async loadSubmissions() {
        const container = document.getElementById('submissionsContainer');
        container.innerHTML = '<div class="loading">Loading submissions...</div>';

        try {
            await this.checkDatabaseConnection();
            const response = await this._authFetch(`${this.apiBase}${this.submissionsEndpoint}`);
            const data = await this._parseSubmissionsResponse(response);
            this.currentSubmissions = data;
            this.applyFilters();
        } catch (error) {
            console.error('Load submissions error:', error);
            container.innerHTML = `
                <div class="error-message" style="display: block;">
                    Failed to load submissions. Please ensure the database server is running.<br>
                    <strong>Start it with:</strong> <code>${AdminDashboard.escapeHtml(this.serverHint)}</code>
                </div>`;
        }
    }

    /**
     * Parse the fetch response into an array of submissions.
     * IELTS wraps in { success, submissions }, Cambridge returns a bare array.
     * Override if needed.
     */
    async _parseSubmissionsResponse(response) {
        const data = await response.json();
        if (Array.isArray(data)) return data;
        if (data.success && data.submissions) return data.submissions;
        throw new Error(data.message || 'Failed to load submissions');
    }

    // ------------------------------------------------------------------
    // Filtering — override applyFilters() for exam-specific filter logic
    // ------------------------------------------------------------------

    /** Override per exam. Base implementation handles the common fields. */
    applyFilters() {
        // Subclasses must implement
        throw new Error('applyFilters() must be overridden');
    }

    clearFilters() {
        document.getElementById('searchStudent').value = '';
        document.getElementById('filterSkill').value = '';
        document.getElementById('filterMock').value = '';
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';
        document.getElementById('filterScored').value = '';
        this.extraFilterIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        this.applyFilters();
    }

    filterTodaySubmissions() {
        const todayISO = new Date().toISOString().split('T')[0];
        document.getElementById('dateFrom').value = todayISO;
        document.getElementById('dateTo').value = todayISO;
        document.getElementById('searchStudent').value = '';
        document.getElementById('filterSkill').value = '';
        document.getElementById('filterMock').value = '';
        document.getElementById('filterScored').value = '';
        this.extraFilterIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        this.applyFilters();
    }

    /**
     * Shared filter predicates. Returns the filtered array.
     * Subclasses call this first, then layer exam-specific predicates.
     */
    _baseFilter(submissions) {
        const searchStudent = document.getElementById('searchStudent').value.toLowerCase();
        const filterSkill = document.getElementById('filterSkill').value;
        const filterMock = document.getElementById('filterMock').value;
        const dateFrom = document.getElementById('dateFrom').value;
        const dateTo = document.getElementById('dateTo').value;
        const filterScored = document.getElementById('filterScored').value;

        return { searchStudent, filterSkill, filterMock, dateFrom, dateTo, filterScored };
    }

    // ------------------------------------------------------------------
    // Display — override displaySubmissions() for exam-specific table
    // ------------------------------------------------------------------

    displaySubmissions(submissions) {
        // Subclasses must implement
        throw new Error('displaySubmissions() must be overridden');
    }

    /**
     * Date-group view. Override `renderDateGroupSubmissionRow(submission)` for per-exam row content.
     */
    displaySubmissionsByDate(submissions) {
        const container = document.getElementById('submissionsContainer');
        const submissionsByDate = this.getSubmissionsByDate(submissions);
        const sortedDates = Object.keys(submissionsByDate).sort((a, b) => new Date(b) - new Date(a));
        const esc = AdminDashboard.escapeHtml;

        let html = '<div class="date-group-container">';

        if (sortedDates.length === 0) {
            html += '<div class="no-submissions">No submissions found for the selected date range.</div>';
        } else {
            sortedDates.forEach((dateKey, index) => {
                const dateInfo = submissionsByDate[dateKey];
                const count = dateInfo.submissions.length;
                const isCollapsed = index > 0;

                html += `
                    <div class="date-group ${isCollapsed ? 'collapsed' : ''}" id="dateGroup_${dateKey}">
                        <div class="date-group-header" onclick="toggleDateGroup('${dateKey}')">
                            <div class="date-group-header-left">
                                <span class="date-group-toggle">\u25BC</span>
                                <span>\uD83D\uDCC5 ${dateInfo.displayDate}</span>
                            </div>
                            <span class="date-group-count">${count} submission${count !== 1 ? 's' : ''}</span>
                        </div>
                        <div class="date-group-submissions">
                `;

                dateInfo.submissions.forEach(submission => {
                    html += this.renderDateGroupSubmissionRow(submission);
                });

                html += '</div></div>';
            });
        }

        html += '</div>';
        container.innerHTML = html;
    }

    /** Override for exam-specific date-group row. */
    renderDateGroupSubmissionRow(submission) {
        const esc = AdminDashboard.escapeHtml;
        const flagged = AdminDashboard.hasAntiCheatViolations(submission);
        const acBadge = AdminDashboard.renderAntiCheatBadge(submission);
        return `
            <div class="date-group-submission${flagged ? ' submission-flagged' : ''}" onclick="openAnswerComparison('${esc(submission.id)}')" style="cursor: pointer;">
                <div class="submission-info">
                    <div class="submission-name">${esc(submission.student_name)} (${esc(submission.student_id)})</div>
                    <div class="submission-details">
                        <span class="skill-badge skill-${esc(submission.skill)}">${esc(submission.skill)}</span>
                        <span class="${this.getScoreClass(submission.score)}">${esc(this.getScoreDisplay(submission))}</span>
                        <span style="color: #6c757d; font-size: 13px;">${esc(this.formatDate(submission.created_at).split(' ')[1])}</span>
                        ${acBadge}
                    </div>
                </div>
                <button class="btn btn-info" style="padding: 4px 8px; font-size: 11px;"
                        onclick="event.stopPropagation(); openAnswerComparison('${esc(submission.id)}')">
                    View
                </button>
            </div>
        `;
    }

    // ------------------------------------------------------------------
    // Date group view toggle
    // ------------------------------------------------------------------

    toggleDateGroupView() {
        this.isDateGroupView = !this.isDateGroupView;
        const button = document.getElementById('dateGroupToggle');
        if (this.isDateGroupView) {
            button.textContent = '\uD83D\uDCCB View as Table';
            button.style.background = '#28a745';
        } else {
            button.textContent = '\uD83D\uDCC5 View by Date';
            button.style.background = this.dateViewDefaultColor;
        }
        this.displaySubmissions(this.filteredSubmissions);
    }

    toggleDateGroup(dateKey) {
        const dateGroup = document.getElementById(`dateGroup_${dateKey}`);
        if (dateGroup) dateGroup.classList.toggle('collapsed');
    }

    // ------------------------------------------------------------------
    // Pagination
    // ------------------------------------------------------------------

    updatePaginationControls(totalItems, startIndex, endIndex) {
        document.getElementById('paginationInfo').textContent =
            `Showing ${startIndex + 1}-${endIndex} of ${totalItems} submissions`;
        document.getElementById('currentPageSpan').textContent = this.currentPage;
        document.getElementById('totalPagesSpan').textContent = this.totalPages;

        const firstBtn = document.getElementById('firstPageBtn');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const lastBtn = document.getElementById('lastPageBtn');

        firstBtn.disabled = this.currentPage === 1;
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === this.totalPages;
        lastBtn.disabled = this.currentPage === this.totalPages;

        const pageJumpInput = document.getElementById('pageJumpInput');
        if (pageJumpInput) {
            pageJumpInput.max = this.totalPages;
            pageJumpInput.placeholder = this.currentPage.toString();
        }
    }

    jumpToPage() {
        const pageInput = document.getElementById('pageJumpInput');
        const pageNumber = parseInt(pageInput.value);
        if (pageNumber && pageNumber >= 1 && pageNumber <= this.totalPages) {
            this.goToPage(pageNumber);
            pageInput.value = '';
        } else {
            alert(`Please enter a valid page number between 1 and ${this.totalPages}`);
            pageInput.focus();
        }
    }

    handlePageJumpEnter(event) {
        if (event.key === 'Enter') this.jumpToPage();
    }

    goToPage(pageNumber) {
        if (pageNumber >= 1 && pageNumber <= this.totalPages) {
            this.currentPage = pageNumber;
            this.displaySubmissions(this.filteredSubmissions);
        }
    }

    resetPagination() {
        this.currentPage = 1;
    }

    // ------------------------------------------------------------------
    // Stats — override for exam-specific stats
    // ------------------------------------------------------------------

    /** Override per exam. */
    updateStats(allSubmissions, filteredSubs) {
        throw new Error('updateStats() must be overridden');
    }

    // ------------------------------------------------------------------
    // Score helpers — override per exam
    // ------------------------------------------------------------------

    getScoreClass(_score) { return 'score-poor'; }
    getScoreDisplay(_submission) { return 'N/A'; }

    // ------------------------------------------------------------------
    // Modal
    // ------------------------------------------------------------------

    closeModal() {
        document.getElementById('answerModal').style.display = 'none';
    }

    setupModalCloseOnOutsideClick() {
        window.onclick = (event) => {
            const modal = document.getElementById('answerModal');
            if (event.target === modal) this.closeModal();
        };
    }

    // ------------------------------------------------------------------
    // CSV Export
    // ------------------------------------------------------------------

    exportData() {
        const csvContent = this.generateCSV(this.filteredSubmissions);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.csvFilenamePrefix}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    /** Override to customize columns. */
    generateCSV(_submissions) {
        throw new Error('generateCSV() must be overridden');
    }

    // ------------------------------------------------------------------
    // Answer management (shared scaffolding)
    // ------------------------------------------------------------------

    initializeAnswerGrid() {
        const grid = document.getElementById('answerGrid');
        grid.innerHTML = '';
        for (let i = 1; i <= 40; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'answer-input-group';
            inputGroup.innerHTML = `
                <label>Q${i}:</label>
                <input type="text" id="answer_${i}" placeholder="Answer ${i}" />
            `;
            grid.appendChild(inputGroup);
        }
        this.updateAnswerStatus('Ready to input answers');
    }

    updateAnswerStatus(message) {
        const status = document.getElementById('answerStatus');
        if (status) {
            status.textContent = message;
            status.style.color = message.includes('\u2705') ? '#28a745' :
                message.includes('\u274C') ? '#dc3545' : '#007bff';
        }
    }

    toggleAnswerManagement() {
        const header = document.querySelector('.answer-management-header');
        const content = document.getElementById('answerManagementContent');
        if (content.classList.contains('open')) {
            content.classList.remove('open');
            header.classList.remove('open');
        } else {
            content.classList.add('open');
            header.classList.add('open');
        }
    }

    /** Override per exam — different endpoints and key structures. */
    initializeAnswerManagement() {}
    async loadCorrectAnswers() {}
    async loadAnswerSet() {}
    async saveAnswerSet() {}
    async clearAnswerSet() {}

    // ------------------------------------------------------------------
    // Answer comparison helpers (shared logic)
    // ------------------------------------------------------------------

    /** Normalize an answer for comparison: lowercase, trim, strip parenthesized parts. */
    static normalizeAnswer(answer) {
        return answer.toString().toLowerCase().trim()
            .replace(/\([^)]*\)/g, '')
            .trim();
    }

    /** Check if studentAnswer matches correctAnswer (string or array of acceptable answers). */
    static isAnswerCorrect(studentAnswer, correctAnswer) {
        if (!studentAnswer || !correctAnswer || studentAnswer === 'No Answer' || correctAnswer === 'N/A') {
            return false;
        }
        const normalizedStudent = AdminDashboard.normalizeAnswer(studentAnswer);
        if (Array.isArray(correctAnswer)) {
            return correctAnswer.some(ans => normalizedStudent === AdminDashboard.normalizeAnswer(ans));
        }
        return normalizedStudent === AdminDashboard.normalizeAnswer(correctAnswer);
    }

    // ------------------------------------------------------------------
    // Auto-refresh
    // ------------------------------------------------------------------

    startAutoRefresh(intervalMs = 60000) {
        setInterval(() => {
            if (this.authToken && document.getElementById('adminContent').style.display !== 'none') {
                this.loadSubmissions();
            }
        }, intervalMs);
    }

    // ------------------------------------------------------------------
    // Keyboard shortcuts for modal scoring workflow
    // ------------------------------------------------------------------

    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('answerModal');
            if (!modal || modal.style.display !== 'block') return;

            // Escape = close modal
            if (e.key === 'Escape') {
                e.preventDefault();
                this.closeModal();
                return;
            }

            // Don't intercept when typing in input/textarea
            const tag = (e.target.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

            // Left/Right arrows = prev/next unscored
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.navigateScoring('prev');
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.navigateScoring('next');
            }
        });
    }

    // ------------------------------------------------------------------
    // Scoring queue — navigate unscored submissions without leaving modal
    // ------------------------------------------------------------------

    /** Override per exam to define what "unscored" means. */
    _isUnscored(submission) {
        return !submission.score;
    }

    /** Get the list of unscored submissions from the current filtered set. */
    getScoringQueue() {
        return this.filteredSubmissions.filter(s => this._isUnscored(s));
    }

    /** Open the first unscored submission in the modal. */
    startScoringQueue() {
        const queue = this.getScoringQueue();
        if (queue.length === 0) { alert('All submissions in the current filter are scored!'); return; }
        this.scoringQueueIndex = 0;
        window.openAnswerComparison(queue[0].id);
    }

    /** Navigate to prev/next unscored submission. */
    navigateScoring(direction) {
        const queue = this.getScoringQueue();
        if (queue.length === 0) { alert('All scored!'); this.closeModal(); return; }
        if (direction === 'next') {
            this.scoringQueueIndex++;
            if (this.scoringQueueIndex >= queue.length) this.scoringQueueIndex = 0;
        } else {
            this.scoringQueueIndex--;
            if (this.scoringQueueIndex < 0) this.scoringQueueIndex = queue.length - 1;
        }
        window.openAnswerComparison(queue[this.scoringQueueIndex].id);
    }

    /**
     * Call from openAnswerComparison to update the scoring nav bar.
     * Shows "3 of 17 unscored" + prev/next buttons inside the modal.
     */
    updateScoringNav(submissionId) {
        const navEl = document.getElementById('scoringNav');
        if (!navEl) return;

        const queue = this.getScoringQueue();
        const idx = queue.findIndex(s => String(s.id) === String(submissionId));
        if (idx !== -1) this.scoringQueueIndex = idx;

        if (queue.length === 0) {
            navEl.innerHTML = '<span style="color:#a5d6a7;font-weight:600;">All scored!</span>';
            navEl.style.display = 'flex';
            return;
        }

        const current = idx !== -1 ? idx + 1 : '-';
        navEl.innerHTML = `
            <button onclick="navigateScoring('prev')" class="scoring-nav-btn" title="Or press Left Arrow">&laquo; Prev</button>
            <span style="color:rgba(255,255,255,0.9);font-size:13px;font-weight:500;">
                ${current} of ${queue.length} unscored
            </span>
            <button onclick="navigateScoring('next')" class="scoring-nav-btn" title="Or press Right Arrow">Next &raquo;</button>
        `;
        navEl.style.display = 'flex';
    }

    /**
     * Call after saving a score to auto-advance to next unscored.
     * Reloads submissions, then opens the next unscored if any remain.
     */
    async advanceAfterScore() {
        await this.loadSubmissions();
        const queue = this.getScoringQueue();
        if (queue.length === 0) {
            this.closeModal();
            alert('All submissions scored!');
            return;
        }
        // Stay at current index (the item we just scored is gone from queue,
        // so the next item slid into our index position)
        if (this.scoringQueueIndex >= queue.length) this.scoringQueueIndex = 0;
        window.openAnswerComparison(queue[this.scoringQueueIndex].id);
    }

    // ------------------------------------------------------------------
    // Submission deletion
    // ------------------------------------------------------------------

    async deleteSubmission(submissionId) {
        if (!confirm('Delete this submission? This cannot be undone.')) return;
        try {
            const response = await this._authFetch(
                `${this.apiBase}${this.submissionsEndpoint}/${submissionId}`,
                { method: 'DELETE' }
            );
            if (!response.ok) {
                const text = await response.text();
                let msg;
                try { msg = JSON.parse(text).message; } catch (_) { msg = 'Server returned ' + response.status; }
                alert('Failed to delete: ' + msg);
                return;
            }
            const data = await response.json();
            if (data.success) {
                this.loadSubmissions();
            } else {
                alert('Failed to delete: ' + (data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Error deleting submission. Check server connection.');
        }
    }

    // ------------------------------------------------------------------
    // Expose methods as window globals for inline onclick handlers
    // ------------------------------------------------------------------

    _exposeGlobals() {
        const self = this;

        // These names match the onclick handlers in the HTML
        window.escapeHtml = AdminDashboard.escapeHtml;
        window.login = (e) => self.login(e);
        window.logout = () => self.logout();
        window.showAdminPanel = () => self.showAdminPanel();
        window.checkDatabaseConnection = () => self.checkDatabaseConnection();
        window.loadSubmissions = () => self.loadSubmissions();
        window.applyFilters = () => self.applyFilters();
        window.clearFilters = () => self.clearFilters();
        window.filterTodaySubmissions = () => self.filterTodaySubmissions();
        window.displaySubmissions = (s) => self.displaySubmissions(s);
        window.displaySubmissionsByDate = (s) => self.displaySubmissionsByDate(s);
        window.toggleDateGroupView = () => self.toggleDateGroupView();
        window.toggleDateGroup = (dk) => self.toggleDateGroup(dk);
        window.updatePaginationControls = (a, b, c) => self.updatePaginationControls(a, b, c);
        window.jumpToPage = () => self.jumpToPage();
        window.handlePageJumpEnter = (e) => self.handlePageJumpEnter(e);
        window.goToPage = (p) => self.goToPage(p);
        window.resetPagination = () => self.resetPagination();
        window.updateStats = (a, f) => self.updateStats(a, f);
        window.getScoreClass = (s) => self.getScoreClass(s);
        window.getScoreDisplay = (s) => self.getScoreDisplay(s);
        window.formatDate = (d) => self.formatDate(d);
        window.calculateDuration = (s, e) => self.calculateDuration(s, e);
        window.closeModal = () => self.closeModal();
        window.exportData = () => self.exportData();
        window.toggleAnswerManagement = () => self.toggleAnswerManagement();
        window.loadAnswerSet = () => self.loadAnswerSet();
        window.saveAnswerSet = () => self.saveAnswerSet();
        window.clearAnswerSet = () => self.clearAnswerSet();

        // Scoring queue navigation
        window.startScoringQueue = () => self.startScoringQueue();
        window.navigateScoring = (d) => self.navigateScoring(d);
        window.advanceAfterScore = () => self.advanceAfterScore();

        // Submission management
        window.deleteSubmission = (id) => self.deleteSubmission(id);

        // Expose state as getters so pagination onclick references like
        // goToPage(currentPage - 1) still work with bare variable names.
        Object.defineProperty(window, 'currentPage', {
            get() { return self.currentPage; },
            set(v) { self.currentPage = v; },
            configurable: true
        });
        Object.defineProperty(window, 'totalPages', {
            get() { return self.totalPages; },
            set(v) { self.totalPages = v; },
            configurable: true
        });
        Object.defineProperty(window, 'filteredSubmissions', {
            get() { return self.filteredSubmissions; },
            set(v) { self.filteredSubmissions = v; },
            configurable: true
        });
        Object.defineProperty(window, 'currentSubmissions', {
            get() { return self.currentSubmissions; },
            set(v) { self.currentSubmissions = v; },
            configurable: true
        });
        Object.defineProperty(window, 'correctAnswers', {
            get() { return self.correctAnswers; },
            set(v) { self.correctAnswers = v; },
            configurable: true
        });
        Object.defineProperty(window, 'authToken', {
            get() { return self.authToken; },
            set(v) { self.authToken = v; },
            configurable: true
        });
        Object.defineProperty(window, 'isDateGroupView', {
            get() { return self.isDateGroupView; },
            set(v) { self.isDateGroupView = v; },
            configurable: true
        });
    }
}
