/*
  Sysidex prototype catalog: the single source of truth for products, categories and logos.
  Add or edit entries here; every page (home, products, categories, search, logo lists) updates.

  Product fields:
    id, cat (industrial | iot | engineering), sub (sub-category label), title, code (searchable),
    (no prices: the cart is a quote list, like bushtorm.com. Every product can be added to the cart and
    every product has a Sales Inquiry.)
    kw (extra search words), isNew, latest (shown in "Latest Products" on the home page),
    img (path under assets/images, for real photos) OR art (key of the line-art illustration).
  To use a real photo for an IoT / Engineering item later, replace `art` with `img`.
*/
window.SX = (function () {
  var CATS = {
    industrial: {
      key: 'industrial', name: 'Industrial & Retail Solutions', short: 'Industrial', page: 'category-industrial.html', color: '#f37021',
      desc: 'Industrial, electrical, mechanical, safety, networking, and retail technology products for diverse projects.'
    },
    iot: {
      key: 'iot', name: 'IoT & Smart Solutions', short: 'IoT', page: 'category-iot.html', color: '#0d9488',
      desc: 'Connected technologies to automate operations, protect assets, control access, and enable real-time decisions.'
    },
    engineering: {
      key: 'engineering', name: 'Engineering Services', short: 'Engineering', page: 'category-engineering.html', color: '#2b3990',
      desc: 'Complete engineering support covering installation, system integration, maintenance, and project execution.'
    }
  };

  var PRODUCTS = [
    // Industrial & Retail: real product photography
    { id: 'impact-wrench', cat: 'industrial', sub: 'Power Tools', title: 'Cordless Impact Wrench 20V Brushless Motor', img: 'products/product-impact-wrench.jpg', isNew: true, latest: true, code: 'IND-001', kw: 'battery torque' },
    { id: 'angle-grinder', cat: 'industrial', sub: 'Cutting Tools', title: 'Angle Grinder 125mm 1200W Heavy Duty', img: 'products/product-angle-grinder.jpg', code: 'IND-002', kw: 'grinding disc' },
    { id: 'circular-saw', cat: 'industrial', sub: 'Cutting Tools', title: 'Circular Saw 185mm 1400W Professional', img: 'products/product-circular-saw.jpg', isNew: true, code: 'IND-003', kw: 'blade wood' },
    { id: 'jigsaw', cat: 'industrial', sub: 'Precision Tools', title: 'Electric Jigsaw 800W Variable Speed Control', img: 'products/product-jigsaw.jpg', code: 'IND-004', kw: 'curve cut' },
    { id: 'reciprocating-saw', cat: 'industrial', sub: 'Demolition Tools', title: 'Reciprocating Saw 1100W Quick-Change', img: 'products/product-reciprocating-saw.jpg', code: 'IND-005', kw: 'sabre demolition' },
    { id: 'orbital-sander', cat: 'industrial', sub: 'Finishing Tools', title: 'Orbital Sander 350W Dust Collection System', img: 'products/product-orbital-sander.jpg', isNew: true, code: 'IND-006', kw: 'sanding dust' },
    { id: 'heat-gun', cat: 'industrial', sub: 'Specialty Tools', title: 'Heat Gun 2000W Dual Temperature Mode', img: 'products/product-heat-gun.jpg', code: 'IND-007', kw: 'thermal paint' },
    { id: 'rotary-hammer', cat: 'industrial', sub: 'Drilling Tools', title: 'Rotary Hammer SDS-Plus 800W Anti-Vibration', img: 'products/product-rotary-hammer.jpg', code: 'IND-008', kw: 'drill concrete sds' },
    { id: 'hammer-drill', cat: 'industrial', sub: 'Power Tools', title: 'Brushless Hammer Drill 18V High Torque', img: 'products/product-hammer-drill.jpg', isNew: true, code: 'IND-009', kw: 'cordless drilling' },
    { id: 'belt-sander', cat: 'industrial', sub: 'Finishing Tools', title: 'Belt Sander 900W Variable Speed Heavy Duty', img: 'products/product-belt-sander.jpg', code: 'IND-010', kw: 'sanding belt' },
    { id: 'mitre-saw', cat: 'industrial', sub: 'Cutting Tools', title: 'Mitre Saw 254mm Slide Compound 1800W', img: 'products/product-mitre-saw.jpg', code: 'IND-011', kw: 'compound slide' },
    { id: 'screwdriver', cat: 'industrial', sub: 'Power Tools', title: 'Cordless Screwdriver 3.6V USB Rechargeable', img: 'products/product-cordless-screwdriver.jpg', code: 'IND-012', kw: 'usb rechargeable' },

    { id: 'uti-tape', cat: 'industrial', sub: 'Marine Instrumentation', title: 'UTI Tape (Ullage Temperature Interface)', img: 'products/uti-tape-main.jpg', code: 'BSH-UTI-091', kw: 'ullage temperature interface marine tank gauge zone 0 explosion proof' },

    // IoT & Smart Solutions: line-art illustrations (placeholders until real photography is supplied)
    { id: 'parcel-locker', cat: 'iot', sub: 'Smart Lockers', title: 'Smart Parcel Locker System', art: 'locker', isNew: true, latest: true, code: 'IOT-001', kw: 'parcel delivery access control' },
    { id: 'locker-bank', cat: 'iot', sub: 'Smart Lockers', title: 'Modular Multi-Compartment Locker Bank', art: 'lockerbank', code: 'IOT-002', kw: 'storage compartment staff' },
    { id: 'rfid-tag-kit', cat: 'iot', sub: 'RFID & Asset Tracking', title: 'RFID Asset Tag Kit', art: 'rfidtag', code: 'IOT-003', kw: 'tracking inventory label' },
    { id: 'rfid-reader', cat: 'iot', sub: 'RFID & Asset Tracking', title: 'Fixed RFID Reader Portal', art: 'rfidreader', code: 'IOT-004', kw: 'gate scanning uhf' },
    { id: 'sensor-node', cat: 'iot', sub: 'Automation & Monitoring', title: 'Wireless Environmental Sensor Node', art: 'sensor', isNew: true, latest: true, code: 'IOT-005', kw: 'temperature humidity monitoring' },
    { id: 'iot-gateway', cat: 'iot', sub: 'Automation & Monitoring', title: 'Remote Monitoring Gateway', art: 'gateway', code: 'IOT-006', kw: 'network connectivity real-time' },

    // Engineering Services: line-art illustrations
    { id: 'system-integration', cat: 'engineering', sub: 'System Integration', title: 'System Integration & Commissioning', art: 'integration', code: 'ENG-001', kw: 'install project execution' },
    { id: 'plc-panel', cat: 'engineering', sub: 'System Integration', title: 'PLC & Control Panel Integration', art: 'plc', code: 'ENG-002', kw: 'automation panel scada' },
    { id: 'amc', cat: 'engineering', sub: 'Maintenance & AMC', title: 'Annual Maintenance Contract (AMC)', art: 'amc', code: 'ENG-003', kw: 'service contract support' },
    { id: 'preventive', cat: 'engineering', sub: 'Maintenance & AMC', title: 'Preventive Maintenance Programme', art: 'gear', code: 'ENG-004', kw: 'inspection scheduled' },
    { id: 'elevator-modernisation', cat: 'engineering', sub: 'Elevator Solutions', title: 'Elevator Modernisation', art: 'elevator', isNew: true, latest: true, code: 'ENG-005', kw: 'lift upgrade vertical transport' },
    { id: 'elevator-emergency', cat: 'engineering', sub: 'Elevator Solutions', title: '24/7 Emergency Elevator Support', art: 'emergency', code: 'ENG-006', kw: 'lift breakdown call-out' }
  ];

  // Cart / order settings shared by every page.
  var SHOP = { maxQty: 99 };

  // Logos. Add as many as needed: the home page shows the first few in a marquee,
  // "View all" opens the full list page.
  var LOGOS = {
    clients: [
      { name: 'Saraya Corniche Hotel', file: 'partner-saraya.png' },
      { name: 'Qatargas', file: 'partner-qatargas.png' },
      { name: 'QatarEnergy', file: 'partner-qatarenergy.png' },
      { name: 'Ministry of Education and Higher Education, State of Qatar', file: 'partner-moehe.png' },
      { name: 'QAPCO — Qatar Petrochemical Company', file: 'partner-qapco.png' },
      { name: 'Umm Al Houl Power', file: 'partner-ummalhoul.png' }
    ],
    partners: [
      { name: 'OSRAM', file: 'partner-osram.png' },
      { name: 'Tridonic', file: 'partner-tridonic.png' },
      { name: 'ABB', file: 'partner-abb.png' },
      { name: 'Philips', file: 'partner-philips.png' },
      { name: 'Schneider Electric', file: 'partner-schneider.png' }
    ]
  };

  return { CATS: CATS, PRODUCTS: PRODUCTS, LOGOS: LOGOS, SHOP: SHOP };
})();
