/*
 * chart.js — 出生図計算モジュール
 * astronomy-engine v2.1.19 (MIT, vendored as astronomy.browser.js) を使用。
 * 地心・視位置・of-date黄経で10天体を計算し、ASC/MC/プラシダスハウスを算出する。
 * UMD: ブラウザでは window.SabianChart、Node では module.exports。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./astronomy.browser.js"));
  } else {
    root.SabianChart = factory(root.Astronomy);
  }
})(typeof self !== "undefined" ? self : this, function (Astronomy) {
  "use strict";

  const DEG = Math.PI / 180;

  const PLANETS = [
    { key: "Sun", ja: "太陽" },
    { key: "Moon", ja: "月" },
    { key: "Mercury", ja: "水星" },
    { key: "Venus", ja: "金星" },
    { key: "Mars", ja: "火星" },
    { key: "Jupiter", ja: "木星" },
    { key: "Saturn", ja: "土星" },
    { key: "Uranus", ja: "天王星" },
    { key: "Neptune", ja: "海王星" },
    { key: "Pluto", ja: "冥王星" },
  ];

  const SIGNS_JA = [
    "牡羊座", "牡牛座", "双子座", "蟹座", "獅子座", "乙女座",
    "天秤座", "蠍座", "射手座", "山羊座", "水瓶座", "魚座",
  ];
  const SIGNS_EN = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
  ];

  function norm360(x) {
    x = x % 360;
    return x < 0 ? x + 360 : x;
  }

  // 出生ローカル時刻 + UTCオフセット(時間) → Date(UTC)
  function toUTCDate(dateStr, timeStr, utcOffsetHours) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":").map(Number);
    const utcMillis = Date.UTC(y, m - 1, d, hh, mm) - utcOffsetHours * 3600 * 1000;
    return new Date(utcMillis);
  }

  /*
   * 平均月交点（ドラゴンヘッド）の黄経
   * 標準多項式: Ω = 125.0445479 − 1934.1362891·T + 0.0020754·T² + T³/467441 − T⁴/60616000
   * T = J2000からのユリウス世紀（TT。この用途では TT≈UT で十分）
   */
  function meanNodeLongitude(date) {
    const time = Astronomy.MakeTime(date);
    const T = time.tt / 36525;
    const omega =
      125.0445479 -
      1934.1362891 * T +
      0.0020754 * T * T +
      (T * T * T) / 467441 -
      (T * T * T * T) / 60616000;
    return norm360(omega);
  }

  // 地心・視・黄経（真黄道・of-date）
  function geoEclipticLongitude(bodyKey, date) {
    const body = Astronomy.Body[bodyKey];
    const vec = Astronomy.GeoVector(body, date, true); // aberration corrected
    const ecl = Astronomy.Ecliptic(vec); // true ecliptic of date
    return norm360(ecl.elon);
  }

  // 平均黄道傾斜（of-date、簡易式で十分な精度）
  function obliquity(date) {
    const time = Astronomy.MakeTime(date);
    const T = time.tt / 36525; // J2000からのユリウス世紀
    return 23.43929111 - 0.013004167 * T - 1.6389e-7 * T * T + 5.0361e-7 * T * T * T;
  }

  // RAMC（子午線の赤経、度）
  function ramcDeg(date, lonEast) {
    const gast = Astronomy.SiderealTime(date); // 時間単位（視恒星時）
    return norm360(gast * 15 + lonEast);
  }

  // MC黄経
  function mcLongitude(ramc, eps) {
    let mc = Math.atan2(Math.sin(ramc * DEG), Math.cos(ramc * DEG) * Math.cos(eps * DEG)) / DEG;
    return norm360(mc);
  }

  // ASC黄経（標準公式）
  function ascLongitude(ramc, eps, lat) {
    const asc = Math.atan2(
      Math.cos(ramc * DEG),
      -(Math.sin(ramc * DEG) * Math.cos(eps * DEG) + Math.tan(lat * DEG) * Math.sin(eps * DEG))
    ) / DEG;
    return norm360(asc);
  }

  // 赤経（黄道上の点）→ 黄経
  function eclLonFromRA(ra, eps) {
    let lon = Math.atan2(Math.sin(ra * DEG) / Math.cos(eps * DEG), Math.cos(ra * DEG)) / DEG;
    return norm360(lon);
  }

  /*
   * プラシダス中間カスプ（11,12,2,3室）— 反復法
   * 定義: カスプ上の点は昼弧/夜弧の指定割合の時角にある。
   *  11室: RA = RAMC + SAd/3      (初期値 RAMC+30)
   *  12室: RA = RAMC + 2*SAd/3    (初期値 RAMC+60)
   *   2室: RA = RAMC + 180 - 2*SAn/3 (初期値 RAMC+120)
   *   3室: RA = RAMC + 180 - SAn/3   (初期値 RAMC+150)
   *  SAd = 90 + AD, SAn = 90 - AD, AD = asin(tanφ·tanδ)
   */
  function placidusIntermediate(ramc, eps, lat, offset, frac, nocturnal) {
    let ra = norm360(ramc + offset);
    for (let i = 0; i < 60; i++) {
      const lon = eclLonFromRA(ra, eps);
      const dec = Math.asin(Math.sin(eps * DEG) * Math.sin(lon * DEG)) / DEG;
      const x = Math.tan(lat * DEG) * Math.tan(dec * DEG);
      if (x < -1 || x > 1) throw new Error("placidus-fail"); // 極域
      const ad = Math.asin(x) / DEG;
      let raNew;
      if (!nocturnal) {
        raNew = norm360(ramc + frac * (90 + ad));
      } else {
        raNew = norm360(ramc + 180 - frac * (90 - ad));
      }
      if (Math.abs(norm360(raNew - ra + 180) - 180) < 1e-7) { ra = raNew; break; }
      ra = raNew;
    }
    return eclLonFromRA(ra, eps);
  }

  // ハウスカスプ計算。プラシダス不能時は whole-sign にフォールバック
  function computeHouses(date, lat, lonEast, ascLon) {
    const eps = obliquity(date);
    const ramc = ramcDeg(date, lonEast);
    const mc = mcLongitude(ramc, eps);
    const asc = ascLongitude(ramc, eps, lat);

    let cusps = new Array(13).fill(0); // 1..12
    let system = "placidus";
    try {
      if (Math.abs(lat) > 66) throw new Error("placidus-fail");
      const c11 = placidusIntermediate(ramc, eps, lat, 30, 1 / 3, false);
      const c12 = placidusIntermediate(ramc, eps, lat, 60, 2 / 3, false);
      const c2 = placidusIntermediate(ramc, eps, lat, 120, 2 / 3, true);
      const c3 = placidusIntermediate(ramc, eps, lat, 150, 1 / 3, true);
      cusps[1] = asc; cusps[2] = c2; cusps[3] = c3;
      cusps[4] = norm360(mc + 180); cusps[5] = norm360(c11 + 180); cusps[6] = norm360(c12 + 180);
      cusps[7] = norm360(asc + 180); cusps[8] = norm360(c2 + 180); cusps[9] = norm360(c3 + 180);
      cusps[10] = mc; cusps[11] = c11; cusps[12] = c12;
    } catch (e) {
      // whole-sign フォールバック
      system = "whole-sign";
      const ascSign = Math.floor(asc / 30);
      for (let h = 1; h <= 12; h++) cusps[h] = norm360((ascSign + h - 1) * 30);
    }
    return { system, cusps, asc, mc, ramc, eps };
  }

  // 黄経 → ハウス番号
  function houseOf(lon, cusps) {
    for (let h = 1; h <= 12; h++) {
      const a = cusps[h];
      const b = cusps[h === 12 ? 1 : h + 1];
      const span = norm360(b - a);
      const off = norm360(lon - a);
      if (off < span) return h;
    }
    return 12;
  }

  function signParts(lon) {
    const signIndex = Math.floor(norm360(lon) / 30);
    const degInSign = norm360(lon) - signIndex * 30;
    return {
      signIndex,
      signJa: SIGNS_JA[signIndex],
      signEn: SIGNS_EN[signIndex],
      degInSign,
      degInt: Math.floor(degInSign),
      // サビアン度数: 切り上げ（0.0°〜1.0°未満 = 1度）
      sabianDeg: Math.floor(degInSign) + 1,
      absSabian: signIndex * 30 + Math.floor(degInSign) + 1,
    };
  }

  // メジャーアスペクト検出（フラット6度オーブ）
  const ASPECTS = [
    { name: "合", en: "conjunction", angle: 0 },
    { name: "衝", en: "opposition", angle: 180 },
    { name: "トライン", en: "trine", angle: 120 },
    { name: "スクエア", en: "square", angle: 90 },
    { name: "セクスタイル", en: "sextile", angle: 60 },
  ];

  function findAspects(planets, orb) {
    orb = orb || 6;
    const out = [];
    for (let i = 0; i < planets.length; i++) {
      for (let j = i + 1; j < planets.length; j++) {
        const d = Math.abs(norm360(planets[i].lon - planets[j].lon + 180) - 180);
        for (const asp of ASPECTS) {
          const diff = Math.abs(d - asp.angle);
          if (diff <= orb) {
            out.push({
              a: planets[i].ja, b: planets[j].ja,
              aKey: planets[i].key, bKey: planets[j].key,
              type: asp.name, typeEn: asp.en, angle: asp.angle,
              orb: Math.round(diff * 10) / 10,
            });
            break;
          }
        }
      }
    }
    out.sort((x, y) => x.orb - y.orb);
    return out;
  }

  /*
   * メイン: 出生図を計算する
   * opts = { dateStr:"YYYY-MM-DD", timeStr:"HH:MM", utcOffsetHours:9, lat, lon }
   */
  function computeChart(opts) {
    const date = toUTCDate(opts.dateStr, opts.timeStr, opts.utcOffsetHours);
    const later = new Date(date.getTime() + 3600 * 1000);

    const houses = computeHouses(date, opts.lat, opts.lon, null);

    const planets = PLANETS.map((p) => {
      const lon = geoEclipticLongitude(p.key, date);
      const lonLater = geoEclipticLongitude(p.key, later);
      const speed = norm360(lonLater - lon + 180) - 180; // deg/hour (符号つき)
      const sp = signParts(lon);
      return {
        key: p.key, ja: p.ja,
        lon,
        retrograde: speed < 0,
        house: houseOf(lon, houses.cusps),
        ...sp,
      };
    });

    // ドラゴンヘッド／テイル（平均ノード）— 逆行フラグなし
    const nodeLon = meanNodeLongitude(date);
    const tailLon = norm360(nodeLon + 180);
    const node = {
      key: "NorthNode", ja: "ドラゴンヘッド", lon: nodeLon,
      house: houseOf(nodeLon, houses.cusps), ...signParts(nodeLon),
    };
    const tail = {
      key: "SouthNode", ja: "ドラゴンテイル", lon: tailLon,
      house: houseOf(tailLon, houses.cusps), ...signParts(tailLon),
    };

    const ascParts = signParts(houses.asc);
    const mcParts = signParts(houses.mc);
    const dscParts = signParts(norm360(houses.asc + 180));
    const aspects = findAspects(planets, 6);

    return {
      input: { ...opts },
      utc: date.toISOString(),
      planets,
      node,
      tail,
      houses,
      asc: { lon: houses.asc, ...ascParts },
      mc: { lon: houses.mc, ...mcParts },
      dsc: { lon: norm360(houses.asc + 180), ...dscParts },
      aspects,
      houseSystem: houses.system,
    };
  }

  /*
   * 二次進行（プログレス）: 1日=1年
   * 進行時刻 = 出生時刻 + 現在年齢（年・小数含む）を「日」として加算。
   * 年齢 = (now − birth) / 365.2425日。
   * 進行天体はネイタルのハウス（natalChart.houses.cusps）に配置する。
   */
  function progressedChart(natalChart, now) {
    now = now || new Date();
    const birth = new Date(natalChart.utc);
    const ageYears = (now.getTime() - birth.getTime()) / (365.2425 * 86400 * 1000);
    const progDate = new Date(birth.getTime() + ageYears * 86400 * 1000);

    const planets = PLANETS.map((p) => {
      const lon = geoEclipticLongitude(p.key, progDate);
      return {
        key: p.key, ja: p.ja, lon,
        house: houseOf(lon, natalChart.houses.cusps),
        ...signParts(lon),
      };
    });

    return {
      asOf: now.toISOString().slice(0, 10),
      ageYears,
      progUtc: progDate.toISOString(),
      planets,
    };
  }

  return {
    computeChart, progressedChart, findAspects, signParts, houseOf, meanNodeLongitude,
    PLANETS, SIGNS_JA, SIGNS_EN,
    _internal: { obliquity, ramcDeg, ascLongitude, mcLongitude, placidusIntermediate, computeHouses, toUTCDate },
  };
});
