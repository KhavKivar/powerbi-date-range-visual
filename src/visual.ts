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
      


        // Open dialog on click
        this.dateRangeInput.onclick = () => {
            // Parse value in format mm/dd/yyyy - mm/dd/yyyy
            const value = this.dateRangeInput.value || '';
            const [startStr, endStr] = value.split(' - ').map(s => s.trim());
            function parseMDY(str: string) {
                const [month, day, year] = str.split('/').map(Number);
                return new Date(year, month - 1, day);
            }
            const start = startStr ? parseMDY(startStr) : new Date();
            const end = endStr ? parseMDY(endStr) : start;

            
            console.log("Opening dialog with start:", start, "end:", end);

            const initialDialogState = { startDate: start.toISOString(), endDate: end.toISOString() };
            this.host.openModalDialog(
                DatePickerDialog.id,
                { actionButtons: [DialogAction.OK, DialogAction.Cancel], size: { width: 800, height: 440 }, position: { type: 0, left: 0, top: 0 }, title: "Date Range" },
                { initialDialogState, defaultTime: { start: this.startDefaultTime, end: this.endDefaultTime } }
            )
                .then(ret => this.handleDialogResult(ret, this.dateRangeInput))
                .catch(error => this.handleDialogError(error, null));
        };
 

        this.target.appendChild(this.dateRangeInput);
   
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

    private handleDialogResult(result: any, Input: HTMLInputElement) {
        if (result.actionId === DialogAction.OK) {
            const { start, end } = result.resultState;
            const s = new Date(start), e = new Date(end ?? start);
            const fmt = (d: Date) => `${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCDate().toString().padStart(2, '0')}/${d.getUTCFullYear()}`;
            
            Input.value = `${fmt(s)} - ${fmt(e)}`;
            if (result.resultState?.reset) {
                this.applyResetFilter();
            }else {
            this.applyDateRangeFilter({ start: s, end: e });
            }
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