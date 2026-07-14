export type Weather = {
  tempC: number;
  feelsLikeC: number;
  windKph: number;
  code: number;
  condition: string;
  uvIndex?: number;
};

// https://open-meteo.com/en/docs — no API key.
export async function fetchWeather(lat: number, lon: number): Promise<Weather> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,wind_speed_10m,weather_code,uv_index",
  );
  url.searchParams.set("wind_speed_unit", "kmh");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("weather fetch failed");
  const json = await res.json();
  const c = json.current;
  const uv = typeof c.uv_index === "number" ? c.uv_index : undefined;
  return {
    tempC: c.temperature_2m,
    feelsLikeC: c.apparent_temperature,
    windKph: c.wind_speed_10m,
    code: c.weather_code,
    condition: describeCode(c.weather_code),
    uvIndex: uv,
  };
}

function describeCode(code: number): string {
  if (code === 0) return "Clear";
  if ([1, 2].includes(code)) return "Mostly clear";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Cloudy";
}
