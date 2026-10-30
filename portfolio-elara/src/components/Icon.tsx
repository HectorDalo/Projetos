export function Icon({ name, size = 20 }: { name: 'arrow' | 'send' | 'mic' | 'orbit' | 'close' | 'menu' | 'code'; size?: number }) {
  const paths = {
    arrow: <><path d="M5 19 19 5M5 5h14v14" /></>,
    send: <><path d="m3 3 19 9-19 9 4-9-4-9Zm4 9h15" /></>,
    mic: <><rect x="9" y="2" width="6" height="13" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" /></>,
    orbit: <><circle cx="12" cy="12" r="4" /><ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-35 12 12)" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    code: <path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
