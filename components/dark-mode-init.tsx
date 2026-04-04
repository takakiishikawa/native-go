export function DarkModeInit() {
  const script = `(function(){function c(){var h=parseInt(new Date().toLocaleString('en-US',{timeZone:'Asia/Ho_Chi_Minh',hour:'numeric',hour12:false}));document.documentElement.classList.toggle('dark',h>=18||h<6);}c();setInterval(c,3600000);})();`
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
