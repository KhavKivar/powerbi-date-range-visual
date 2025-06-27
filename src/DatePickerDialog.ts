import powerbi from "powerbi-visuals-api";
import DialogConstructorOptions = powerbi.extensibility.visual.DialogConstructorOptions;
import DialogAction = powerbi.DialogAction;

// Import your custom DateRangePicker
import { DateRangePicker,DateRangePickerCallbacks,DateRangePickerOptions } from './custom_calendar/daterangepicker';
import './custom_calendar/style.css';
import { DateInterval } from './custom_calendar/customType';



export class DatePickerDialog {
    static id = "DatePickerDialog";
    private picker: DateRangePicker | null = null;
    private host: any;

    constructor(options: DialogConstructorOptions, initialState: any) {
        this.host = options.host;
        const s = (v: any) => { const d = new Date(v); return v && !isNaN(d.getTime()) ? d : null; };
        const ids = initialState?.initialDialogState || {};
        const dt = initialState?.defaultTime || {};
        const startDate = s(ids.startDate) || new Date();
        const endDate = s(ids.endDate) || new Date();
        const defaultStart = s(dt.start);
        const defaultEnd = s(dt.end);
        const dateRangePickerOptions: DateRangePickerOptions = {
            initialStartDate: startDate,
            initialEndDate: endDate,
            defaultStartDate: defaultStart ,
            defaultEndDate: defaultEnd ,
            targetElement: options.element,
        };
        this.picker = new DateRangePicker(dateRangePickerOptions, {
            onChange: (range: { start: Date | null, end: Date | null }) => {
                this.host.setResult({
                    start: range.start ?? new Date(),
                    end: range.end ?? new Date()
                });
            },
            onReset: () => {
                if (defaultStart && defaultEnd) {
                    this.picker?.setDates(defaultStart, defaultEnd);
                   
                    this.host.setResult({ start: defaultStart, end: defaultEnd,reset: true });
                
                }
            }
        });
        this.picker.setDates(startDate, endDate);
    }

    public destroy(): void {
        if (this.picker && typeof (this.picker as any).destroy === 'function') {
            (this.picker as any).destroy();
        }
    }

    
    
}




// Register dialog globally (with type safety)
interface DialogRegistry { [key: string]: any; }
(globalThis as any).dialogRegistry = (globalThis as any).dialogRegistry || {};
(globalThis as any).dialogRegistry[DatePickerDialog.id] = DatePickerDialog;