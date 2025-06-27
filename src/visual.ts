/*

 * Power BI Visual CLI

 *

 * Copyright (c) Microsoft Corporation

 * All rights reserved.

 * MIT License

 */

"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import { VisualFormattingSettingsModel } from "./settings";
import { DatePickerDialog } from "./DatePickerDialog";
import { DateInterval } from './custom_calendar/customType';
import DialogAction = powerbi.DialogAction;
import DataView = powerbi.DataView;
import { IAdvancedFilter, FilterType, IFilterTarget } from "powerbi-models";

export class Visual implements IVisual {
    private target: HTMLElement;
    private formattingSettings: VisualFormattingSettingsModel | undefined;
    private formattingSettingsService: FormattingSettingsService;
    private dateRangeInput: HTMLInputElement;
    private host: IVisualHost;
    private dataView: DataView | undefined;
    private startDefaultTime: Date | null = null;
    private endDefaultTime: Date | null = null;
    private previousMinTimestamp: number | null = null;
    private previousMaxTimestamp: number | null = null;

    constructor(options: VisualConstructorOptions) {
        if (!options) throw new Error("VisualConstructorOptions is required.");
        this.host = options.host;
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        this.dateRangeInput = document.createElement('input');
        this.dateRangeInput.type = 'text';
        this.dateRangeInput.id = 'dateRangeInput';
        this.dateRangeInput.readOnly = true;
        // Remove old content
        this.target.innerHTML = '';

        // Container for date range picker
        const container = document.createElement('div');
        container.className = 'custom-date-range-container';

        // Start date input
        const startInput = document.createElement('input');
        startInput.type = 'text';
        startInput.className = 'date-range-input start-date';
        startInput.readOnly = true;
        // End date input
        const endInput = document.createElement('input');
        endInput.type = 'text';
        endInput.className = 'date-range-input end-date';
        endInput.readOnly = true;

        // Set initial values
        const now = new Date();
        startInput.value = now.toLocaleDateString();
        endInput.value = now.toLocaleDateString();

        // Open dialog on click
        const openDialog = () => {
            const [start, end] = [startInput.value, endInput.value].map(d => new Date(d));
            const initialDialogState = { startDate: start.toISOString(), endDate: end.toISOString() };
            this.host.openModalDialog(
                DatePickerDialog.id,
                { actionButtons: [DialogAction.OK, DialogAction.Cancel], size: { width: 800, height: 440 }, position: { type: 0, left: 0, top: 0 }, title: "Date Range" },
                { initialDialogState, defaultTime: { start: this.startDefaultTime, end: this.endDefaultTime } }
            )
                .then(ret => this.handleDialogResult(ret, startInput, endInput))
                .catch(error => this.handleDialogError(error, startInput));
        };
        startInput.onclick = openDialog;
        endInput.onclick = openDialog;

        // Inputs row
        const inputsRow = document.createElement('div');
        inputsRow.className = 'inputs-row';
        inputsRow.appendChild(startInput);
        inputsRow.appendChild(endInput);
        container.appendChild(inputsRow);

        // --- Range slider logic ---
        let minDate = now, maxDate = now;
        if (this.startDefaultTime && this.endDefaultTime) {
            minDate = this.startDefaultTime;
            maxDate = this.endDefaultTime;
        }
        let startDate = minDate;
        let endDate = maxDate;
        startInput.value = startDate.toLocaleDateString();
        endInput.value = endDate.toLocaleDateString();

        // Helper: date <-> percent
        const dateToPercent = (date: Date) => {
            return ((date.getTime() - minDate.getTime()) / (maxDate.getTime() - minDate.getTime())) * 100;
        };
        const percentToDate = (percent: number) => {
            const t = minDate.getTime() + (percent / 100) * (maxDate.getTime() - minDate.getTime());
            return new Date(Math.round(t));
        };

        // Slider handles
        const sliderRow = document.createElement('div');
        sliderRow.className = 'slider-row';
        const sliderTrack = document.createElement('div');
        sliderTrack.className = 'slider-track';
        const leftHandle = document.createElement('div');
        leftHandle.className = 'slider-handle left';
        const rightHandle = document.createElement('div');
        rightHandle.className = 'slider-handle right';
        sliderRow.appendChild(sliderTrack);
        sliderRow.appendChild(leftHandle);
        sliderRow.appendChild(rightHandle);
        container.appendChild(sliderRow);

        // Set initial handle positions
        const updateHandles = () => {
            const leftPercent = dateToPercent(startDate);
            const rightPercent = dateToPercent(endDate);
            leftHandle.style.left = `calc(${leftPercent}% - 12px)`;
            rightHandle.style.left = `calc(${rightPercent}% - 12px)`;
        };
        updateHandles();

        // Drag logic
        let dragging: 'left' | 'right' | null = null;
        let sliderRect: DOMRect;
        const onMouseMove = (e: MouseEvent) => {
            if (!dragging) return;
            const x = e.clientX - sliderRect.left;
            const percent = Math.max(0, Math.min(100, (x / sliderRect.width) * 100));
            if (dragging === 'left') {
                const newStart = percentToDate(percent);
                if (newStart < endDate) {
                    startDate = newStart;
                    startInput.value = startDate.toLocaleDateString();
                    updateHandles();
                }
            } else {
                const newEnd = percentToDate(percent);
                if (newEnd > startDate) {
                    endDate = newEnd;
                    endInput.value = endDate.toLocaleDateString();
                    updateHandles();
                }
            }
        };
        const onMouseUp = () => {
            if (dragging) {
                this.applyDateRangeFilter({ start: startDate, end: endDate });
            }
            dragging = null;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        leftHandle.onmousedown = (e) => {
            dragging = 'left';
            sliderRect = sliderRow.getBoundingClientRect();
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
        };
        rightHandle.onmousedown = (e) => {
            dragging = 'right';
            sliderRect = sliderRow.getBoundingClientRect();
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
        };

        // Update slider if dialog changes
        this.handleDialogResult = (result: any, startInput: HTMLInputElement, endInput: HTMLInputElement) => {
            if (result.actionId === DialogAction.OK) {
                const { start, end } = result.resultState;
                const s = new Date(start), e = new Date(end ?? start);
                startDate = s;
                endDate = e;
                startInput.value = s.toLocaleDateString();
                endInput.value = e.toLocaleDateString();
                updateHandles();
                this.applyDateRangeFilter({ start: s, end: e });
            }
        };

        this.target.appendChild(container);
        this.dateRangeInput = startInput; // For compatibility
    }

    public update(options: VisualUpdateOptions) {
        if (options.dataViews?.length) {
            this.dataView = options.dataViews[0];
            const cat = this.dataView.categorical?.categories?.[0]?.values;
            if (cat) {
                const timestamps = cat.map(v => new Date(v as any).getTime()).filter(t => !isNaN(t));
                if (timestamps.length) {
                    const min = Math.min(...timestamps), max = Math.max(...timestamps);
                    if (this.previousMinTimestamp !== min || this.previousMaxTimestamp !== max) {
                        this.previousMinTimestamp = min;
                        this.previousMaxTimestamp = max;
                        this.startDefaultTime = new Date(min);
                        this.endDefaultTime = new Date(max);
                        this.dateRangeInput.value = `${this.startDefaultTime.toLocaleDateString()} - ${this.endDefaultTime.toLocaleDateString()}`;
                    }
                }
            }
        }
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel,
            options.dataViews?.[0]
        );
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings ?? new VisualFormattingSettingsModel());
    }

    public destroy(): void { }

    private handleDialogResult(result: any, startInput: HTMLInputElement, endInput: HTMLInputElement) {
        if (result.actionId === DialogAction.OK) {
            const { start, end } = result.resultState;
            const s = new Date(start), e = new Date(end ?? start);
            const fmt = (d: Date) => `${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCDate().toString().padStart(2, '0')}/${d.getUTCFullYear()}`;
            startInput.value = fmt(s);
            endInput.value = fmt(e);
            this.applyDateRangeFilter({ start: s, end: e });
        }
    }

    private handleDialogError(error: any, targetElement: HTMLInputElement) {
        targetElement.value = "Error: " + (error ? JSON.stringify(error) : "Unknown error");
        console.error("Dialog error:", error);
    }

    private applyDateRangeFilter(dateInterval: DateInterval) {
        const catSource = this.dataView?.categorical?.categories?.[0]?.source;
        const table = catSource?.queryName?.split(".")[0];
        const column = catSource?.displayName || catSource?.queryName?.split(".")[1];
        if (!table || !column) return;
        const target: IFilterTarget = { table, column };
        const start = dateInterval.start ? new Date(dateInterval.start) : new Date();
        const end = dateInterval.end ? new Date(dateInterval.end) : start;
        const filter: IAdvancedFilter = {
            $schema: "http://powerbi.com/product/schema#advanced",
            target,
            logicalOperator: "And",
            conditions: [
                { operator: "GreaterThanOrEqual", value: start.toISOString() },
                { operator: "LessThanOrEqual", value: end.toISOString() }
            ],
            filterType: FilterType.Advanced
        };
        this.host.applyJsonFilter(filter, "general", "filter", powerbi.FilterAction.merge);
    }

    private applyResetFilter() {
        this.host.applyJsonFilter(null, "general", "filter", powerbi.FilterAction.remove);
    }

}