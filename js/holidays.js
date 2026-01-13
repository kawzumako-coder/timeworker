(function(){
  function pad2(n){ return String(n).padStart(2,"0"); }
  function toISO(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }

  function nthWeekdayOfMonth(y, mi, wd, nth){
    const first = new Date(y, mi, 1);
    const diff = (wd - first.getDay() + 7) % 7;
    return new Date(y, mi, 1 + diff + (nth-1)*7);
  }
  function vernalEquinoxDay(y){
    return Math.floor(20.8431 + 0.242194*(y-1980) - Math.floor((y-1980)/4));
  }
  function autumnEquinoxDay(y){
    return Math.floor(23.2488 + 0.242194*(y-1980) - Math.floor((y-1980)/4));
  }

  function baseHolidayName(date){
    const y=date.getFullYear(), m=date.getMonth()+1, d=date.getDate(), iso=toISO(date);

    if (m===1 && d===1) return "元日";
    if (y>=2000 && iso===toISO(nthWeekdayOfMonth(y,0,1,2))) return "成人の日";
    if (y<2000 && m===1 && d===15) return "成人の日";

    if (m===2 && d===11) return "建国記念の日";
    if (y>=2020 && m===2 && d===23) return "天皇誕生日";

    if (m===3 && d===vernalEquinoxDay(y)) return "春分の日";

    if (m===4 && d===29) return "昭和の日";

    if (m===5 && d===3) return "憲法記念日";
    if (m===5 && d===4) return "みどりの日";
    if (m===5 && d===5) return "こどもの日";

    if (y>=2003 && iso===toISO(nthWeekdayOfMonth(y,6,1,3))) return "海の日";
    if (y<2003 && m===7 && d===20) return "海の日";

    if (y>=2016 && m===8 && d===11) return "山の日";

    if (y>=2003 && iso===toISO(nthWeekdayOfMonth(y,8,1,3))) return "敬老の日";
    if (y<2003 && m===9 && d===15) return "敬老の日";

    if (m===9 && d===autumnEquinoxDay(y)) return "秋分の日";

    if (y>=2000 && iso===toISO(nthWeekdayOfMonth(y,9,1,2))) return "スポーツの日";
    if (y<2000 && m===10 && d===10) return "スポーツの日";

    if (m===11 && d===3) return "文化の日";
    if (m===11 && d===23) return "勤労感謝の日";

    return "";
  }

  function holidayMapForYear(year){
    const map = new Map();
    let cur=new Date(year,0,1), end=new Date(year,11,31);

    while(cur<=end){
      const name=baseHolidayName(cur);
      if(name) map.set(toISO(cur), name);
      cur.setDate(cur.getDate()+1);
    }

    for(const [iso] of Array.from(map.entries())){
      const d=new Date(iso+"T00:00:00");
      if(d.getDay()===0){
        let x=new Date(d);
        while(true){
          x.setDate(x.getDate()+1);
          const xIso=toISO(x);
          if(!map.has(xIso)){ map.set(xIso,"振替休日"); break; }
        }
      }
    }

    cur=new Date(year,0,1);
    while(cur<=end){
      const iso=toISO(cur);
      if(!map.has(iso) && cur.getDay()!==0){
        const prev=new Date(cur); prev.setDate(prev.getDate()-1);
        const next=new Date(cur); next.setDate(next.getDate()+1);
        if(map.has(toISO(prev)) && map.has(toISO(next))) map.set(iso,"国民の休日");
      }
      cur.setDate(cur.getDate()+1);
    }

    return map;
  }

  const cache=new Map();

  window.getHolidayName = function(date){
    const y=date.getFullYear();
    if(!cache.has(y)) cache.set(y, holidayMapForYear(y));
    return cache.get(y).get(toISO(date)) || "";
  };

  window._toISO = function(date){
    return toISO(date);
  };
})();
