export function WorldTree({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 520" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 根 — 地中に広がるネットワーク */}
      <g opacity="0.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
        {/* 主根 */}
        <path d="M200 380 C200 420, 180 440, 150 470" />
        <path d="M200 380 C200 410, 210 445, 240 475" />
        <path d="M200 380 C195 400, 170 420, 130 450" />
        <path d="M200 380 C205 405, 230 430, 270 460" />
        {/* 細根 */}
        <path d="M150 470 C130 485, 100 490, 80 510" />
        <path d="M150 470 C145 490, 150 505, 140 520" />
        <path d="M240 475 C260 490, 280 495, 310 510" />
        <path d="M240 475 C245 495, 240 505, 250 520" />
        <path d="M130 450 C110 460, 85 465, 60 480" />
        <path d="M130 450 C115 470, 100 490, 90 520" />
        <path d="M270 460 C290 470, 315 475, 340 490" />
        <path d="M270 460 C285 480, 300 500, 310 520" />
        {/* 微細な根 */}
        <path d="M80 510 C60 515, 40 520, 20 520" opacity="0.5" />
        <path d="M310 510 C330 515, 350 518, 380 520" opacity="0.5" />
        <path d="M60 480 C40 490, 25 500, 10 510" opacity="0.5" />
        <path d="M340 490 C355 498, 370 505, 390 512" opacity="0.5" />
        {/* データノード — 根の交点に光る点 */}
        <circle cx="150" cy="470" r="2" fill="currentColor" opacity="0.4" />
        <circle cx="240" cy="475" r="2" fill="currentColor" opacity="0.4" />
        <circle cx="130" cy="450" r="2" fill="currentColor" opacity="0.4" />
        <circle cx="270" cy="460" r="2" fill="currentColor" opacity="0.4" />
        <circle cx="80" cy="510" r="1.5" fill="currentColor" opacity="0.3" />
        <circle cx="310" cy="510" r="1.5" fill="currentColor" opacity="0.3" />
      </g>

      {/* 幹 */}
      <g stroke="currentColor" strokeLinecap="round">
        <path d="M200 380 C200 340, 198 300, 200 260" strokeWidth="3" opacity="0.25" />
        <path d="M196 380 C194 350, 192 310, 195 260" strokeWidth="1.5" opacity="0.12" />
        <path d="M204 380 C206 345, 207 305, 205 260" strokeWidth="1.5" opacity="0.12" />
      </g>

      {/* 枝 */}
      <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.2">
        {/* 左の枝 */}
        <path d="M200 280 C180 270, 150 260, 120 240" />
        <path d="M120 240 C100 230, 75 225, 55 215" />
        <path d="M120 240 C110 225, 95 210, 80 195" />
        <path d="M200 300 C175 290, 145 285, 110 270" />
        <path d="M110 270 C90 262, 65 258, 45 250" />

        {/* 右の枝 */}
        <path d="M200 280 C220 270, 250 260, 280 240" />
        <path d="M280 240 C300 230, 325 225, 345 215" />
        <path d="M280 240 C290 225, 305 210, 320 195" />
        <path d="M200 300 C225 290, 255 285, 290 270" />
        <path d="M290 270 C310 262, 335 258, 355 250" />

        {/* 上の枝 */}
        <path d="M200 260 C190 240, 175 220, 160 200" />
        <path d="M160 200 C148 185, 130 170, 115 155" />
        <path d="M200 260 C210 240, 225 220, 240 200" />
        <path d="M240 200 C252 185, 270 170, 285 155" />
        <path d="M200 260 C195 235, 188 210, 180 185" />
        <path d="M200 260 C205 235, 212 210, 220 185" />

        {/* 最上部 */}
        <path d="M200 260 C200 230, 198 200, 200 170" />
        <path d="M200 170 C192 150, 180 132, 165 118" />
        <path d="M200 170 C208 150, 220 132, 235 118" />
        <path d="M200 170 C200 148, 198 128, 200 110" />
      </g>

      {/* 葉 — 丸い集まり */}
      <g fill="currentColor" opacity="0.06">
        <circle cx="200" cy="115" r="40" />
        <circle cx="160" cy="145" r="35" />
        <circle cx="240" cy="145" r="35" />
        <circle cx="130" cy="180" r="30" />
        <circle cx="270" cy="180" r="30" />
        <circle cx="115" cy="155" r="25" />
        <circle cx="285" cy="155" r="25" />
        <circle cx="100" cy="210" r="22" />
        <circle cx="300" cy="210" r="22" />
        <circle cx="165" cy="200" r="28" />
        <circle cx="235" cy="200" r="28" />
        <circle cx="80" cy="195" r="18" />
        <circle cx="320" cy="195" r="18" />
        <circle cx="55" cy="215" r="15" />
        <circle cx="345" cy="215" r="15" />
      </g>

      {/* 光の粒 — データが流れるイメージ */}
      <g fill="currentColor">
        <circle cx="200" cy="320" r="1.5" opacity="0.3">
          <animate attributeName="opacity" values="0.1;0.4;0.1" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="180" cy="280" r="1" opacity="0.2">
          <animate attributeName="opacity" values="0.1;0.3;0.1" dur="4s" begin="1s" repeatCount="indefinite" />
        </circle>
        <circle cx="220" cy="270" r="1" opacity="0.2">
          <animate attributeName="opacity" values="0.1;0.35;0.1" dur="3.5s" begin="0.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="160" cy="230" r="1" opacity="0.15">
          <animate attributeName="opacity" values="0.05;0.25;0.05" dur="4.5s" begin="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="240" cy="225" r="1" opacity="0.15">
          <animate attributeName="opacity" values="0.05;0.25;0.05" dur="5s" begin="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="200" cy="180" r="1.5" opacity="0.2">
          <animate attributeName="opacity" values="0.1;0.35;0.1" dur="3s" begin="0.8s" repeatCount="indefinite" />
        </circle>
        <circle cx="140" cy="260" r="0.8" opacity="0.15">
          <animate attributeName="opacity" values="0.05;0.2;0.05" dur="4s" begin="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="260" cy="255" r="0.8" opacity="0.15">
          <animate attributeName="opacity" values="0.05;0.2;0.05" dur="3.8s" begin="2.5s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
}

export function RootLine({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1200 80" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.12">
        <path d="M600 0 C580 15, 520 30, 420 45 C350 55, 250 60, 100 65 C50 68, 10 70, 0 72" />
        <path d="M600 0 C620 15, 680 30, 780 45 C850 55, 950 60, 1100 65 C1150 68, 1190 70, 1200 72" />
        <path d="M600 0 C590 20, 560 40, 500 55 C450 65, 380 70, 300 75" />
        <path d="M600 0 C610 20, 640 40, 700 55 C750 65, 820 70, 900 75" />
        <path d="M600 0 C595 25, 570 50, 530 65 C490 75, 430 78, 380 80" />
        <path d="M600 0 C605 25, 630 50, 670 65 C710 75, 770 78, 820 80" />
      </g>
      <circle cx="600" cy="2" r="2" fill="currentColor" opacity="0.15" />
    </svg>
  );
}
