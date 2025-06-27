export interface DateRangePickerOptions {
    targetElement?: HTMLElement | null;
    initialStartDate?: Date;
    initialEndDate?: Date;
    defaultStartDate?: Date ;
    defaultEndDate?: Date ;
}

export interface DateRangePickerCallbacks {
    onChange?: (range: { start: Date | null, end: Date | null }) => void;
    onReset?: () => void;
}

export class DateRangePicker {
    private targetElement: HTMLElement | null;
    private onChangeCallback: ((range: { start: Date | null, end: Date | null }) => void) | null;
    private onResetCallback: (() => void) | null;
    private startDate: Date | null;
    private endDate: Date | null;
    private leftViewDate: Date;
    private rightViewDate: Date;
    private calendarVisible: boolean;
    private calendar: HTMLElement | null;
    private _handleMousedown: (e: MouseEvent) => void;
    private _showCalendarBound: () => void;
    private defaultStartDate: Date | null;
    private defaultEndDate: Date | null;

    constructor(options: DateRangePickerOptions, callbacks: DateRangePickerCallbacks) {
        this.targetElement = options.targetElement || null;
        this.onChangeCallback = callbacks.onChange || null;
        this.onResetCallback = callbacks.onReset || null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        this.startDate = options.initialStartDate ? new Date(options.initialStartDate) : new Date(today);
        this.endDate = options.initialEndDate ? new Date(options.initialEndDate) : new Date(today);

        this.defaultStartDate = options.defaultStartDate ?? null;
        this.defaultEndDate = options.defaultEndDate ?? null;

        if (
            this.startDate && this.endDate &&
            this.startDate.getMonth() === this.endDate.getMonth() &&
            this.startDate.getFullYear() === this.endDate.getFullYear()
        ) {
            this.leftViewDate = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), 1);
            this.rightViewDate = new Date(this.startDate.getFullYear(), this.startDate.getMonth() + 1, 1);
        } else {
            this.leftViewDate = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), 1);
            this.rightViewDate = new Date(this.endDate.getFullYear(), this.endDate.getMonth(), 1);
        }

        this.calendarVisible = false;
        this.calendar = null;

        this._handleMousedown = this.handleMousedown.bind(this);
        this._showCalendarBound = () => this.showCalendar();

        this.init();
    }

    private init(): void {
        if (this.targetElement) {
            this.renderCalendar();
        }
    }

    public showCalendar(): void {
        if (this.calendarVisible) return;
        this.calendarVisible = true;
        this.renderCalendar();
        document.addEventListener('mousedown', this._handleMousedown);
    }

    public hideCalendar(): void {
        if (!this.calendarVisible) return;
        this.calendarVisible = false;
        if (this.calendar && this.calendar.parentNode) {
            this.calendar.parentNode.removeChild(this.calendar);
        }
        document.removeEventListener('mousedown', this._handleMousedown);
    }

    private handleMousedown(e: MouseEvent): void {
        if (this.calendar && !this.calendar.contains(e.target as Node)) {
            this.hideCalendar();
        }
    }

    public renderCalendar(): void {
        if (this.calendar && this.calendar.parentNode) {
            this.calendar.parentNode.removeChild(this.calendar);
        }
        this.calendar = document.createElement('div');
        this.calendar.className = 'calendar';

        // --- Main content row: quick select, left, right calendar ---
        const calendarContent = document.createElement('div');
        calendarContent.className = 'calendar-content';

        // Quick select (column)
        const quickSelect = this.createQuickSelectSection();
        calendarContent.appendChild(quickSelect);

        // Left calendar
        const leftCalendar = document.createElement('div');
        leftCalendar.className = 'calendar-area left-calendar-area';
        leftCalendar.appendChild(this.createHeader(this.leftViewDate, -1, 'left'));
        leftCalendar.appendChild(this.createWeekdays());
        leftCalendar.appendChild(this.createDaysGrid(this.leftViewDate));
        calendarContent.appendChild(leftCalendar);

        // Right calendar
        const rightCalendar = document.createElement('div');
        rightCalendar.className = 'calendar-area right-calendar-area';
        rightCalendar.appendChild(this.createHeader(this.rightViewDate, 1, 'right'));
        rightCalendar.appendChild(this.createWeekdays());
        rightCalendar.appendChild(this.createDaysGrid(this.rightViewDate));
        calendarContent.appendChild(rightCalendar);

        this.calendar.appendChild(calendarContent);

        // Append to DOM
        if (this.targetElement) {
            this.targetElement.appendChild(this.calendar);
        } else {
            document.body.appendChild(this.calendar);
        }
    }

    public createHeader(date: Date, delta: number, calendarSide: 'left' | 'right'): HTMLElement {
        const header = document.createElement('div');
        header.className = 'calendar-header';

        // Prev button
        const prevButton = document.createElement('button');
        prevButton.className = 'nav-button prev';
        prevButton.innerHTML = '&#10094;';
        prevButton.title = 'Previous Month';
        prevButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (calendarSide === 'left') {
                this.leftViewDate.setMonth(this.leftViewDate.getMonth() - 1);
                if (this.leftViewDate >= this.rightViewDate) {
                    this.rightViewDate = new Date(this.leftViewDate.getFullYear(), this.leftViewDate.getMonth() + 1, 1);
                }
            } else {
                this.rightViewDate.setMonth(this.rightViewDate.getMonth() - 1);
                if (this.rightViewDate <= this.leftViewDate) {
                    this.leftViewDate = new Date(this.rightViewDate.getFullYear(), this.rightViewDate.getMonth() - 1, 1);
                }
            }
            this.renderCalendar();
        });
        header.appendChild(prevButton);

        // Month/Year
        const monthYearContainer = document.createElement('span');
        monthYearContainer.className = 'month-year';
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthSpan = document.createElement('span');
        monthSpan.textContent = monthNames[date.getMonth()] + ' ';
        monthSpan.className = 'month-span';
        monthYearContainer.appendChild(monthSpan);

        const yearText = document.createElement('span');
        yearText.className = 'year-text';
        yearText.textContent = date.getFullYear().toString();
        monthYearContainer.appendChild(yearText);

        const yearInput = document.createElement('input');
        yearInput.type = 'text';
        yearInput.value = date.getFullYear().toString();
        yearInput.className = 'year-input';
        yearInput.pattern = "^\\d{4}$";
        yearInput.title = 'Enter a 4-digit year';
        yearInput.style.display = 'none';
        monthYearContainer.appendChild(yearInput);
        header.appendChild(monthYearContainer);

        // Next button
        const nextButton = document.createElement('button');
        nextButton.className = 'nav-button next';
        nextButton.innerHTML = '&#10095;';
        nextButton.title = 'Next Month';
        nextButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (calendarSide === 'left') {
                this.leftViewDate.setMonth(this.leftViewDate.getMonth() + 1);
                if (this.leftViewDate >= this.rightViewDate) {
                    this.rightViewDate = new Date(this.leftViewDate.getFullYear(), this.leftViewDate.getMonth() + 1, 1);
                }
            } else {
                this.rightViewDate.setMonth(this.rightViewDate.getMonth() + 1);
                if (this.rightViewDate <= this.leftViewDate) {
                    this.leftViewDate = new Date(this.rightViewDate.getFullYear(), this.rightViewDate.getMonth() - 1, 1);
                }
            }
            this.renderCalendar();
        });
        header.appendChild(nextButton);

        // Year input handling
        yearText.addEventListener('click', () => {
            yearText.style.display = 'none';
            yearInput.style.display = '';
            yearInput.focus();
            yearInput.select();
        });

        yearInput.addEventListener('blur', () => {
            yearInput.style.display = 'none';
            yearText.style.display = '';
            const val = yearInput.value.trim();
            if (/^\d{4}$/.test(val)) {
                yearText.textContent = val;
                const newYear = parseInt(val, 10);
                if (!isNaN(newYear)) {
                    if (calendarSide === 'left') {
                        this.leftViewDate.setFullYear(newYear);
                        if (this.leftViewDate >= this.rightViewDate) {
                            this.rightViewDate = new Date(this.leftViewDate.getFullYear(), this.leftViewDate.getMonth() + 1, 1);
                        }
                    } else {
                        this.rightViewDate.setFullYear(newYear);
                        if (this.rightViewDate <= this.leftViewDate) {
                            this.leftViewDate = new Date(this.rightViewDate.getFullYear(), this.rightViewDate.getMonth() - 1, 1);
                        }
                    }
                    this.renderCalendar();
                }
            } else {
                yearInput.value = yearText.textContent || '';
            }
        });

        yearInput.addEventListener('keydown', (e: KeyboardEvent) => {
            if (["Enter", "Escape", "Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
                if (e.key === "Enter") {
                    yearInput.blur();
                }
                return;
            }
            if (!/\d/.test(e.key) || (yearInput.value.length >= 4 && !window.getSelection()?.toString())) {
                e.preventDefault();
            }
        });

        return header;
    }

    public createWeekdays(): HTMLElement {
        const weekdaysContainer = document.createElement('div');
        weekdaysContainer.className = 'calendar-weekdays';
        const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        weekdays.forEach(day => {
            const dayElem = document.createElement('div');
            dayElem.className = 'calendar-weekday';
            dayElem.textContent = day;
            weekdaysContainer.appendChild(dayElem);
        });
        return weekdaysContainer;
    }

    public createDaysGrid(monthDate: Date): HTMLElement {
        const daysGrid = document.createElement('div');
        daysGrid.className = 'calendar-days-grid';

        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Fill initial empty days
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'calendar-day empty';
            daysGrid.appendChild(empty);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = String(day);
            dayElement.dataset.date = new Date(year, month, day).toDateString();

            // Highlight selected range
            const currentDate = new Date(year, month, day);
            currentDate.setHours(0, 0, 0, 0);

            // Grey out if outside allowed range
            let isDisabled = false;
            if ((this.defaultStartDate && currentDate < this.defaultStartDate) || (this.defaultEndDate && currentDate > this.defaultEndDate)) {
                dayElement.classList.add('disabled', 'out-of-range');
                isDisabled = true;
            }

            if (this.startDate && this.endDate) {
                if (currentDate.getTime() === this.startDate.getTime()) {
                    dayElement.classList.add('selected', 'range-start');
                } else if (currentDate.getTime() === this.endDate.getTime()) {
                    dayElement.classList.add('selected', 'range-end');
                } else if (currentDate > this.startDate && currentDate < this.endDate) {
                    dayElement.classList.add('in-range');
                }
            } else if (this.startDate && !this.endDate && currentDate.getTime() === this.startDate.getTime()) {
                dayElement.classList.add('selected');
            }

            if (!isDisabled) {
                dayElement.addEventListener('click', () => this.selectDate(day, year, month));
            }
            daysGrid.appendChild(dayElement);
        }
        return daysGrid;
    }

    public selectDate(day: number, year: number, month: number): void {
        const selectedDate = new Date(year, month, day);
        selectedDate.setHours(0, 0, 0, 0);

        if (!this.startDate || (this.startDate && this.endDate)) {
            this.startDate = selectedDate;
            this.endDate = null;
        } else {
            if (selectedDate < this.startDate) {
                this.endDate = this.startDate;
                this.startDate = selectedDate;
            } else {
                this.endDate = selectedDate;
            }
        }

        this.renderCalendar();
        if (this.onChangeCallback) {
            if (this.startDate && this.endDate) {
                this.onChangeCallback({ start: this.startDate, end: this.endDate });
            } else if (this.startDate) {
                this.onChangeCallback({ start: this.startDate, end: this.startDate });
            }
        }
    }

    public setDates(startDate: Date, endDate: Date): void {
        this.startDate = startDate;
        this.endDate = endDate;
        if (this.startDate && this.endDate &&
            this.startDate.getMonth() === this.endDate.getMonth() &&
            this.startDate.getFullYear() === this.endDate.getFullYear()) {
            this.leftViewDate = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), 1);
            this.rightViewDate = new Date(this.startDate.getFullYear(), this.startDate.getMonth() + 1, 1);
        } else if (this.startDate && this.endDate) {
            this.leftViewDate = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), 1);
            this.rightViewDate = new Date(this.endDate.getFullYear(), this.endDate.getMonth(), 1);
        }
        this.renderCalendar();
    }

    public formatDate(date: Date): string {
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
        return date.toLocaleDateString(undefined, options);
    }

    public createQuickSelectSection(): HTMLElement {
        const section = document.createElement('div');
        section.className = 'quick-select-section';

        const buttonsData = [
            { text: 'Today', range: 'today' },
            { text: 'Last 7 Days', range: 'last7days' },
            { text: 'Last 15 Days', range: 'last15days' },
            { text: 'This Month', range: 'thismonth' },
            { text: 'Last 3 Months', range: 'last3months' },
            { text: 'This Year', range: 'thisyear' }
        ];

        buttonsData.forEach(btnInfo => {
            const button = document.createElement('button');
            button.textContent = btnInfo.text;
            button.dataset.range = btnInfo.range;
            button.className = 'quick-select-button';
            button.addEventListener('click', () => this.handleQuickSelect(btnInfo.range));
            section.appendChild(button);
        });

        // Reset Button
        const resetButton = document.createElement('button');
        resetButton.className = 'reset-button';
        resetButton.title = 'Clear selection';
        resetButton.textContent = 'Reset';
        resetButton.addEventListener('click', () => {
            this.resetSelection();
        });
        const bottomBar = document.createElement('div');
        bottomBar.className = 'calendar-bottom-bar';
        bottomBar.appendChild(resetButton);
        section.appendChild(bottomBar);

        return section;
    }

    private handleQuickSelect(rangeType: string): void {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let startDate: Date, endDate: Date;

        switch (rangeType) {
            case 'today':
                startDate = new Date(today);
                endDate = new Date(today);
                break;
            case 'last7days':
                endDate = new Date(today);
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 6);
                break;
            case 'last15days':
                endDate = new Date(today);
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 14);
                break;
            case 'thismonth':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'last3months':
                endDate = new Date(today);
                startDate = new Date(today.getFullYear(), today.getMonth()-3, 1);
                break;
            case 'thisyear':
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = new Date(today.getFullYear(), 11, 31);
                break;
            default:
                return;
        }
        this.setDates(startDate, endDate);
        if (this.onChangeCallback) {
            this.onChangeCallback({ start: startDate, end: endDate });
        }
    }

    public resetSelection(): void {
        this.startDate = null;
        this.endDate = null;
        this.leftViewDate = new Date();
        this.rightViewDate = new Date();
        this.rightViewDate.setMonth(this.rightViewDate.getMonth() + 1);
        this.renderCalendar();
        if (this.onResetCallback) {
            this.onResetCallback();
        }
    }
}