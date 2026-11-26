# Library rules

- Resolve outing weather only through `outing-weather.ts` using absolute provider instants; hourly instantaneous fields require adjacent bounding samples, rain/showers and gust belong to the preceding hour, and gaps never extend the horizon or become zero. Why: Today and assistant share inspectable coverage without changing clothing thresholds.
