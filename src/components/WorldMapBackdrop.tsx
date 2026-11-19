export function WorldMapBackdrop() {
  const hubs = [
    { x: 185, y: 125, delay: '0s', color: '#38BDF8', label: 'New York' },
    { x: 255, y: 245, delay: '0.6s', color: '#EC4899', label: 'Sao Paulo' },
    { x: 430, y: 108, delay: '1.1s', color: '#38BDF8', label: 'London' },
    { x: 470, y: 165, delay: '0.3s', color: '#A78BFA', label: 'Cairo' },
    { x: 525, y: 155, delay: '0.9s', color: '#EC4899', label: 'Dubai' },
    { x: 615, y: 168, delay: '0.4s', color: '#38BDF8', label: 'Dhaka' },
    { x: 660, y: 210, delay: '1.4s', color: '#EC4899', label: 'Jakarta' },
    { x: 705, y: 155, delay: '0.8s', color: '#A78BFA', label: 'Manila' },
    { x: 455, y: 215, delay: '1.7s', color: '#38BDF8', label: 'Lagos' },
  ];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <svg
        viewBox="0 0 860 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover opacity-55"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="zozo-map-glow" cx="55%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#6D28D9" stopOpacity="0.45" />
            <stop offset="55%" stopColor="#2563EB" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#16082E" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="860" height="360" fill="url(#zozo-map-glow)" />

        {/* Stylized Continental Dot-Grid Clusters */}
        <g fill="#C4B5FD" fillOpacity="0.34">
          {/* North America */}
          <circle cx="120" cy="85" r="2.2" />
          <circle cx="138" cy="80" r="2.2" />
          <circle cx="155" cy="78" r="2.2" />
          <circle cx="172" cy="85" r="2.2" />
          <circle cx="190" cy="95" r="2.2" />
          <circle cx="132" cy="102" r="2.2" />
          <circle cx="150" cy="100" r="2.2" />
          <circle cx="168" cy="102" r="2.2" />
          <circle cx="184" cy="112" r="2.2" />
          <circle cx="145" cy="120" r="2.2" />
          <circle cx="164" cy="122" r="2.2" />
          <circle cx="182" cy="128" r="2.2" />
          <circle cx="158" cy="140" r="2.2" />
          <circle cx="174" cy="148" r="2.2" />
          <circle cx="186" cy="162" r="2.2" />

          {/* South America */}
          <circle cx="222" cy="195" r="2.2" />
          <circle cx="240" cy="200" r="2.2" />
          <circle cx="255" cy="212" r="2.2" />
          <circle cx="232" cy="216" r="2.2" />
          <circle cx="248" cy="228" r="2.2" />
          <circle cx="262" cy="238" r="2.2" />
          <circle cx="236" cy="242" r="2.2" />
          <circle cx="250" cy="256" r="2.2" />
          <circle cx="238" cy="270" r="2.2" />
          <circle cx="232" cy="288" r="2.2" />

          {/* Europe */}
          <circle cx="412" cy="94" r="2.2" />
          <circle cx="428" cy="90" r="2.2" />
          <circle cx="445" cy="88" r="2.2" />
          <circle cx="462" cy="92" r="2.2" />
          <circle cx="420" cy="108" r="2.2" />
          <circle cx="436" cy="106" r="2.2" />
          <circle cx="452" cy="108" r="2.2" />
          <circle cx="468" cy="110" r="2.2" />
          <circle cx="432" cy="122" r="2.2" />
          <circle cx="448" cy="124" r="2.2" />
          <circle cx="465" cy="126" r="2.2" />

          {/* Africa */}
          <circle cx="425" cy="155" r="2.2" />
          <circle cx="444" cy="154" r="2.2" />
          <circle cx="462" cy="158" r="2.2" />
          <circle cx="478" cy="164" r="2.2" />
          <circle cx="422" cy="174" r="2.2" />
          <circle cx="440" cy="176" r="2.2" />
          <circle cx="458" cy="178" r="2.2" />
          <circle cx="476" cy="182" r="2.2" />
          <circle cx="442" cy="196" r="2.2" />
          <circle cx="460" cy="198" r="2.2" />
          <circle cx="476" cy="204" r="2.2" />
          <circle cx="456" cy="220" r="2.2" />
          <circle cx="472" cy="224" r="2.2" />
          <circle cx="462" cy="244" r="2.2" />
          <circle cx="474" cy="260" r="2.2" />

          {/* MENA & Asia */}
          <circle cx="505" cy="142" r="2.2" />
          <circle cx="522" cy="146" r="2.2" />
          <circle cx="540" cy="148" r="2.2" />
          <circle cx="518" cy="162" r="2.2" />
          <circle cx="536" cy="164" r="2.2" />
          <circle cx="565" cy="110" r="2.2" />
          <circle cx="585" cy="108" r="2.2" />
          <circle cx="605" cy="112" r="2.2" />
          <circle cx="626" cy="114" r="2.2" />
          <circle cx="648" cy="116" r="2.2" />
          <circle cx="670" cy="118" r="2.2" />
          <circle cx="576" cy="128" r="2.2" />
          <circle cx="596" cy="130" r="2.2" />
          <circle cx="616" cy="132" r="2.2" />
          <circle cx="638" cy="134" r="2.2" />
          <circle cx="660" cy="136" r="2.2" />
          <circle cx="682" cy="138" r="2.2" />
          <circle cx="588" cy="150" r="2.2" />
          <circle cx="608" cy="154" r="2.2" />
          <circle cx="628" cy="156" r="2.2" />
          <circle cx="648" cy="158" r="2.2" />
          <circle cx="668" cy="156" r="2.2" />
          <circle cx="690" cy="152" r="2.2" />
          <circle cx="604" cy="172" r="2.2" />
          <circle cx="622" cy="176" r="2.2" />
          <circle cx="640" cy="182" r="2.2" />
          <circle cx="658" cy="188" r="2.2" />
          <circle cx="652" cy="206" r="2.2" />
          <circle cx="672" cy="212" r="2.2" />
          <circle cx="692" cy="216" r="2.2" />

          {/* Oceania */}
          <circle cx="695" cy="252" r="2.2" />
          <circle cx="715" cy="254" r="2.2" />
          <circle cx="734" cy="260" r="2.2" />
          <circle cx="705" cy="272" r="2.2" />
          <circle cx="726" cy="276" r="2.2" />
        </g>

        {/* Connecting Network Arcs */}
        <g strokeWidth="1.25" strokeDasharray="4 4">
          <path
            d="M185 125 Q308 55 430 108"
            stroke="#38BDF8"
            className="zozo-map-arc"
          />
          <path
            d="M430 108 Q478 100 525 155"
            stroke="#EC4899"
            className="zozo-map-arc"
            style={{ animationDelay: '0.7s' }}
          />
          <path
            d="M525 155 Q570 128 615 168"
            stroke="#38BDF8"
            className="zozo-map-arc"
            style={{ animationDelay: '1.2s' }}
          />
          <path
            d="M615 168 Q662 175 705 155"
            stroke="#EC4899"
            className="zozo-map-arc"
            style={{ animationDelay: '1.8s' }}
          />
          <path
            d="M455 215 Q535 190 615 168"
            stroke="#A78BFA"
            className="zozo-map-arc"
            style={{ animationDelay: '0.4s' }}
          />
          <path
            d="M255 245 Q355 195 455 215"
            stroke="#38BDF8"
            className="zozo-map-arc"
            style={{ animationDelay: '1.5s' }}
          />
        </g>

        {/* Hub Nodes */}
        {hubs.map((hub) => (
          <g key={hub.label}>
            <circle
              cx={hub.x}
              cy={hub.y}
              r="7"
              fill={hub.color}
              fillOpacity="0.22"
              className="zozo-map-node"
              style={{ animationDelay: hub.delay }}
            />
            <circle cx={hub.x} cy={hub.y} r="3" fill={hub.color} />
          </g>
        ))}
      </svg>
    </div>
  );
}
