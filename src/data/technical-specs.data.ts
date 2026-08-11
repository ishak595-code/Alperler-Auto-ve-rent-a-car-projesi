export interface TechnicalSpecs {
  maxSpeed: string;
  acceleration: string;
  cityFuel: string;
  highwayFuel: string;
  combinedFuel: string;
  tankCapacity: string;
  trunkCapacity: string;
  wheels: string;
  dimensions: string;
  cylinders: string;
  engineVolume: string;
  enginePower: string;
  torque: string;
  weight: string;
  drivetrain: string;
}

export const CAR_SPECS_DB: Record<string, TechnicalSpecs> = {
  'Nissan_Qashqai': {
    maxSpeed: '199 km/s', acceleration: '10.5 sn', cityFuel: '6.5 L', highwayFuel: '5.2 L', combinedFuel: '5.8 L',
    tankCapacity: '55 L', trunkCapacity: '504 L', wheels: '235/55 R18', dimensions: '4425 x 1835 x 1625 mm',
    cylinders: '4 Silindir', engineVolume: '1332 cc', enginePower: '158 HP', torque: '270 Nm', weight: '1450 kg', drivetrain: 'Önden Çekiş'
  },
  'Peugeot_3008': {
    maxSpeed: '201 km/s', acceleration: '11.5 sn', cityFuel: '4.5 L', highwayFuel: '3.8 L', combinedFuel: '4.1 L',
    tankCapacity: '53 L', trunkCapacity: '520 L', wheels: '225/55 R18', dimensions: '4447 x 1841 x 1620 mm',
    cylinders: '4 Silindir', engineVolume: '1499 cc', enginePower: '130 HP', torque: '300 Nm', weight: '1430 kg', drivetrain: 'Önden Çekiş'
  },
  'Volkswagen_Tiguan': {
    maxSpeed: '202 km/s', acceleration: '9.2 sn', cityFuel: '7.5 L', highwayFuel: '5.5 L', combinedFuel: '6.3 L',
    tankCapacity: '58 L', trunkCapacity: '615 L', wheels: '235/55 R18', dimensions: '4509 x 1839 x 1675 mm',
    cylinders: '4 Silindir', engineVolume: '1498 cc', enginePower: '150 HP', torque: '250 Nm', weight: '1540 kg', drivetrain: 'Önden Çekiş'
  },
  'Dacia_Duster': {
    maxSpeed: '183 km/s', acceleration: '10.2 sn', cityFuel: '5.5 L', highwayFuel: '4.5 L', combinedFuel: '4.9 L',
    tankCapacity: '50 L', trunkCapacity: '478 L', wheels: '215/60 R17', dimensions: '4341 x 1804 x 1693 mm',
    cylinders: '4 Silindir', engineVolume: '1461 cc', enginePower: '115 HP', torque: '260 Nm', weight: '1320 kg', drivetrain: 'Önden Çekiş'
  },
  'Mercedes-Benz_C 180 AMG': {
    maxSpeed: '225 km/s', acceleration: '8.5 sn', cityFuel: '7.8 L', highwayFuel: '4.8 L', combinedFuel: '5.8 L',
    tankCapacity: '59 L', trunkCapacity: '475 L', wheels: '225/45 R17', dimensions: '4591 x 1770 x 1447 mm',
    cylinders: '4 Silindir', engineVolume: '1595 cc', enginePower: '156 HP', torque: '250 Nm', weight: '1495 kg', drivetrain: 'Arkadan İtiş'
  },
  'Mercedes-Benz_C 200 4MATIC AMG': {
    maxSpeed: '241 km/s', acceleration: '7.1 sn', cityFuel: '8.5 L', highwayFuel: '5.2 L', combinedFuel: '6.6 L',
    tankCapacity: '66 L', trunkCapacity: '455 L', wheels: '225/45 R18', dimensions: '4751 x 1820 x 1438 mm',
    cylinders: '4 Silindir', engineVolume: '1496 cc', enginePower: '204 HP', torque: '300 Nm', weight: '1650 kg', drivetrain: 'Dört Çeker (4WD)'
  },
  'Peugeot_508 1.5 BlueHDi GT': {
    maxSpeed: '208 km/s', acceleration: '10.0 sn', cityFuel: '4.4 L', highwayFuel: '3.4 L', combinedFuel: '3.8 L',
    tankCapacity: '55 L', trunkCapacity: '487 L', wheels: '235/45 R18', dimensions: '4750 x 1859 x 1403 mm',
    cylinders: '4 Silindir', engineVolume: '1499 cc', enginePower: '130 HP', torque: '300 Nm', weight: '1420 kg', drivetrain: 'Önden Çekiş'
  },
  'Renault_Megane 1.3 TCe Icon': {
    maxSpeed: '205 km/s', acceleration: '9.8 sn', cityFuel: '6.8 L', highwayFuel: '4.7 L', combinedFuel: '5.4 L',
    tankCapacity: '50 L', trunkCapacity: '503 L', wheels: '205/50 R17', dimensions: '4632 x 1814 x 1443 mm',
    cylinders: '4 Silindir', engineVolume: '1332 cc', enginePower: '140 HP', torque: '240 Nm', weight: '1350 kg', drivetrain: 'Önden Çekiş'
  },
  'Volkswagen_Passat 1.5 TSI Elegance': {
    maxSpeed: '220 km/s', acceleration: '8.7 sn', cityFuel: '6.6 L', highwayFuel: '4.4 L', combinedFuel: '5.2 L',
    tankCapacity: '66 L', trunkCapacity: '586 L', wheels: '235/45 R18', dimensions: '4775 x 1832 x 1483 mm',
    cylinders: '4 Silindir', engineVolume: '1498 cc', enginePower: '150 HP', torque: '250 Nm', weight: '1465 kg', drivetrain: 'Önden Çekiş'
  },
  'BMW_320i Sedan M Sport': {
    maxSpeed: '230 km/s', acceleration: '7.6 sn', cityFuel: '7.7 L', highwayFuel: '5.1 L', combinedFuel: '6.0 L',
    tankCapacity: '59 L', trunkCapacity: '480 L', wheels: '225/45 R18', dimensions: '4709 x 1827 x 1435 mm',
    cylinders: '4 Silindir', engineVolume: '1597 cc', enginePower: '170 HP', torque: '250 Nm', weight: '1525 kg', drivetrain: 'Arkadan İtiş'
  },
  'Audi_A3 Sportback 35 Turbo FSI Advanced': {
    maxSpeed: '224 km/s', acceleration: '8.4 sn', cityFuel: '6.2 L', highwayFuel: '4.2 L', combinedFuel: '4.9 L',
    tankCapacity: '50 L', trunkCapacity: '380 L', wheels: '225/45 R17', dimensions: '4343 x 1816 x 1449 mm',
    cylinders: '4 Silindir', engineVolume: '1498 cc', enginePower: '150 HP', torque: '250 Nm', weight: '1395 kg', drivetrain: 'Önden Çekiş'
  },
  'Mercedes-Benz_C 200 d AMG': {
    maxSpeed: '226 km/s', acceleration: '8.1 sn', cityFuel: '5.5 L', highwayFuel: '3.9 L', combinedFuel: '4.5 L',
    tankCapacity: '66 L', trunkCapacity: '455 L', wheels: '225/45 R18', dimensions: '4751 x 1820 x 1438 mm',
    cylinders: '4 Silindir', engineVolume: '1992 cc', enginePower: '163 HP', torque: '380 Nm', weight: '1650 kg', drivetrain: 'Arkadan İtiş'
  },
  'Volkswagen_Passat 1.5 TSI Business': {
    maxSpeed: '220 km/s', acceleration: '8.7 sn', cityFuel: '6.6 L', highwayFuel: '4.4 L', combinedFuel: '5.2 L',
    tankCapacity: '66 L', trunkCapacity: '586 L', wheels: '215/55 R17', dimensions: '4775 x 1832 x 1483 mm',
    cylinders: '4 Silindir', engineVolume: '1498 cc', enginePower: '150 HP', torque: '250 Nm', weight: '1465 kg', drivetrain: 'Önden Çekiş'
  },
  'Ford_Focus 1.5 TDCi Trend X': {
    maxSpeed: '193 km/s', acceleration: '10.5 sn', cityFuel: '4.3 L', highwayFuel: '3.4 L', combinedFuel: '3.8 L',
    tankCapacity: '53 L', trunkCapacity: '316 L', wheels: '205/55 R16', dimensions: '4360 x 1823 x 1469 mm',
    cylinders: '4 Silindir', engineVolume: '1499 cc', enginePower: '120 HP', torque: '300 Nm', weight: '1350 kg', drivetrain: 'Önden Çekiş'
  },
  'Renault_Megane 1.5 dCi Touch': {
    maxSpeed: '190 km/s', acceleration: '11.2 sn', cityFuel: '4.2 L', highwayFuel: '3.4 L', combinedFuel: '3.7 L',
    tankCapacity: '49 L', trunkCapacity: '503 L', wheels: '205/55 R16', dimensions: '4632 x 1814 x 1443 mm',
    cylinders: '4 Silindir', engineVolume: '1461 cc', enginePower: '110 HP', torque: '250 Nm', weight: '1320 kg', drivetrain: 'Önden Çekiş'
  },
  'Volkswagen_Passat': {
    maxSpeed: '220 km/s', acceleration: '8.7 sn', cityFuel: '6.6 L', highwayFuel: '4.4 L', combinedFuel: '5.2 L',
    tankCapacity: '66 L', trunkCapacity: '586 L', wheels: '215/55 R17', dimensions: '4775 x 1832 x 1483 mm',
    cylinders: '4 Silindir', engineVolume: '1498 cc', enginePower: '150 HP', torque: '250 Nm', weight: '1465 kg', drivetrain: 'Önden Çekiş'
  },
  'Toyota_Corolla': {
    maxSpeed: '180 km/s', acceleration: '10.9 sn', cityFuel: '3.6 L', highwayFuel: '4.1 L', combinedFuel: '3.8 L',
    tankCapacity: '43 L', trunkCapacity: '471 L', wheels: '225/45 R17', dimensions: '4630 x 1780 x 1435 mm',
    cylinders: '4 Silindir', engineVolume: '1798 cc', enginePower: '122 HP', torque: '142 Nm', weight: '1440 kg', drivetrain: 'Önden Çekiş'
  },
  'Renault_Megane': {
    maxSpeed: '205 km/s', acceleration: '9.8 sn', cityFuel: '6.8 L', highwayFuel: '4.7 L', combinedFuel: '5.4 L',
    tankCapacity: '50 L', trunkCapacity: '503 L', wheels: '205/50 R17', dimensions: '4632 x 1814 x 1443 mm',
    cylinders: '4 Silindir', engineVolume: '1332 cc', enginePower: '140 HP', torque: '240 Nm', weight: '1350 kg', drivetrain: 'Önden Çekiş'
  },
  'Fiat_Egea Cross': {
    maxSpeed: '190 km/s', acceleration: '11.8 sn', cityFuel: '7.2 L', highwayFuel: '4.9 L', combinedFuel: '5.8 L',
    tankCapacity: '50 L', trunkCapacity: '440 L', wheels: '215/55 R17', dimensions: '4386 x 1802 x 1556 mm',
    cylinders: '4 Silindir', engineVolume: '1368 cc', enginePower: '100 HP', torque: '127 Nm', weight: '1265 kg', drivetrain: 'Önden Çekiş'
  },
  'Toyota_Hilux 4x4': {
    maxSpeed: '175 km/s', acceleration: '10.8 sn', cityFuel: '8.5 L', highwayFuel: '6.5 L', combinedFuel: '7.3 L',
    tankCapacity: '80 L', trunkCapacity: '1000 kg', wheels: '265/60 R18', dimensions: '5325 x 1855 x 1815 mm',
    cylinders: '4 Silindir', engineVolume: '2393 cc', enginePower: '150 HP', torque: '400 Nm', weight: '2100 kg', drivetrain: 'Dört Çeker (4WD)'
  },
  'Ford_Ranger Wildtrak': {
    maxSpeed: '180 km/s', acceleration: '10.5 sn', cityFuel: '9.2 L', highwayFuel: '7.0 L', combinedFuel: '7.8 L',
    tankCapacity: '80 L', trunkCapacity: '1000 kg', wheels: '265/60 R18', dimensions: '5359 x 1867 x 1815 mm',
    cylinders: '4 Silindir', engineVolume: '1996 cc', enginePower: '213 HP', torque: '500 Nm', weight: '2246 kg', drivetrain: 'Dört Çeker (4WD)'
  },
  'Mitsubishi_L200': {
    maxSpeed: '175 km/s', acceleration: '11.5 sn', cityFuel: '8.8 L', highwayFuel: '6.8 L', combinedFuel: '7.5 L',
    tankCapacity: '75 L', trunkCapacity: '1000 kg', wheels: '265/60 R18', dimensions: '5305 x 1815 x 1775 mm',
    cylinders: '4 Silindir', engineVolume: '2268 cc', enginePower: '150 HP', torque: '400 Nm', weight: '1950 kg', drivetrain: 'Dört Çeker (4WD)'
  },
  'Isuzu_D-Max': {
    maxSpeed: '180 km/s', acceleration: '10.5 sn', cityFuel: '8.5 L', highwayFuel: '6.5 L', combinedFuel: '7.3 L',
    tankCapacity: '76 L', trunkCapacity: '1000 kg', wheels: '265/60 R18', dimensions: '5265 x 1870 x 1790 mm',
    cylinders: '4 Silindir', engineVolume: '1898 cc', enginePower: '163 HP', torque: '360 Nm', weight: '2000 kg', drivetrain: 'Dört Çeker (4WD)'
  },
  'Renault_Clio': {
    maxSpeed: '180 km/s', acceleration: '11.5 sn', cityFuel: '6.5 L', highwayFuel: '4.5 L', combinedFuel: '5.2 L',
    tankCapacity: '42 L', trunkCapacity: '391 L', wheels: '195/55 R16', dimensions: '4050 x 1798 x 1440 mm',
    cylinders: '3 Silindir', engineVolume: '999 cc', enginePower: '90 HP', torque: '160 Nm', weight: '1150 kg', drivetrain: 'Önden Çekiş'
  },
  'Hyundai_i20': {
    maxSpeed: '188 km/s', acceleration: '11.4 sn', cityFuel: '6.8 L', highwayFuel: '4.6 L', combinedFuel: '5.4 L',
    tankCapacity: '40 L', trunkCapacity: '352 L', wheels: '195/55 R16', dimensions: '4040 x 1775 x 1450 mm',
    cylinders: '3 Silindir', engineVolume: '998 cc', enginePower: '100 HP', torque: '172 Nm', weight: '1165 kg', drivetrain: 'Önden Çekiş'
  },
  'Volkswagen_Polo': {
    maxSpeed: '187 km/s', acceleration: '10.8 sn', cityFuel: '5.8 L', highwayFuel: '4.2 L', combinedFuel: '4.8 L',
    tankCapacity: '40 L', trunkCapacity: '351 L', wheels: '185/65 R15', dimensions: '4074 x 1751 x 1451 mm',
    cylinders: '3 Silindir', engineVolume: '999 cc', enginePower: '95 HP', torque: '175 Nm', weight: '1170 kg', drivetrain: 'Önden Çekiş'
  },
  'Peugeot_208': {
    maxSpeed: '188 km/s', acceleration: '10.8 sn', cityFuel: '5.5 L', highwayFuel: '4.0 L', combinedFuel: '4.5 L',
    tankCapacity: '44 L', trunkCapacity: '311 L', wheels: '195/55 R16', dimensions: '4055 x 1745 x 1430 mm',
    cylinders: '3 Silindir', engineVolume: '1199 cc', enginePower: '100 HP', torque: '205 Nm', weight: '1150 kg', drivetrain: 'Önden Çekiş'
  },
  'Skoda_Octavia': {
    maxSpeed: '228 km/s', acceleration: '8.5 sn', cityFuel: '5.8 L', highwayFuel: '4.0 L', combinedFuel: '4.7 L',
    tankCapacity: '45 L', trunkCapacity: '600 L', wheels: '225/45 R17', dimensions: '4689 x 1829 x 1470 mm',
    cylinders: '4 Silindir', engineVolume: '1498 cc', enginePower: '150 HP', torque: '250 Nm', weight: '1350 kg', drivetrain: 'Önden Çekiş'
  },
  'Chery_Tiggo 8 Pro': {
    maxSpeed: '190 km/s', acceleration: '9.1 sn', cityFuel: '9.5 L', highwayFuel: '6.5 L', combinedFuel: '7.6 L',
    tankCapacity: '51 L', trunkCapacity: '1179 L', wheels: '235/55 R18', dimensions: '4722 x 1860 x 1705 mm',
    cylinders: '4 Silindir', engineVolume: '1598 cc', enginePower: '183 HP', torque: '275 Nm', weight: '1640 kg', drivetrain: 'Önden Çekiş'
  },
  'MG_HS': {
    maxSpeed: '190 km/s', acceleration: '9.9 sn', cityFuel: '8.5 L', highwayFuel: '6.5 L', combinedFuel: '7.3 L',
    tankCapacity: '55 L', trunkCapacity: '463 L', wheels: '235/50 R18', dimensions: '4574 x 1876 x 1664 mm',
    cylinders: '4 Silindir', engineVolume: '1490 cc', enginePower: '162 HP', torque: '250 Nm', weight: '1550 kg', drivetrain: 'Önden Çekiş'
  },
  'Mercedes-Benz_E-Class': {
    maxSpeed: '240 km/s', acceleration: '7.4 sn', cityFuel: '6.5 L', highwayFuel: '4.5 L', combinedFuel: '5.2 L',
    tankCapacity: '66 L', trunkCapacity: '540 L', wheels: '245/45 R18', dimensions: '4935 x 1852 x 1460 mm',
    cylinders: '4 Silindir', engineVolume: '1950 cc', enginePower: '194 HP', torque: '400 Nm', weight: '1750 kg', drivetrain: 'Arkadan İtiş'
  },
  'BMW_520i': {
    maxSpeed: '235 km/s', acceleration: '7.9 sn', cityFuel: '7.5 L', highwayFuel: '5.0 L', combinedFuel: '5.9 L',
    tankCapacity: '68 L', trunkCapacity: '530 L', wheels: '245/45 R18', dimensions: '4963 x 1868 x 1479 mm',
    cylinders: '4 Silindir', engineVolume: '1597 cc', enginePower: '170 HP', torque: '250 Nm', weight: '1680 kg', drivetrain: 'Arkadan İtiş'
  },
  'Audi_A6': {
    maxSpeed: '246 km/s', acceleration: '8.1 sn', cityFuel: '5.5 L', highwayFuel: '4.2 L', combinedFuel: '4.7 L',
    tankCapacity: '73 L', trunkCapacity: '530 L', wheels: '225/55 R18', dimensions: '4939 x 1886 x 1457 mm',
    cylinders: '4 Silindir', engineVolume: '1968 cc', enginePower: '204 HP', torque: '400 Nm', weight: '1720 kg', drivetrain: 'Önden Çekiş'
  },
  'Mercedes-Benz_C Serisi (Süslenmiş Gelin Arabası)': {
    maxSpeed: '225 km/s', acceleration: '8.5 sn', cityFuel: '7.8 L', highwayFuel: '4.8 L', combinedFuel: '5.8 L',
    tankCapacity: '59 L', trunkCapacity: '475 L', wheels: '225/45 R17', dimensions: '4591 x 1770 x 1447 mm',
    cylinders: '4 Silindir', engineVolume: '1595 cc', enginePower: '156 HP', torque: '250 Nm', weight: '1495 kg', drivetrain: 'Arkadan İtiş'
  },
  'Mercedes-Benz_Vito VIP': {
    maxSpeed: '195 km/s', acceleration: '11.0 sn', cityFuel: '8.2 L', highwayFuel: '6.4 L', combinedFuel: '7.0 L',
    tankCapacity: '70 L', trunkCapacity: '1030 L', wheels: '225/55 R17', dimensions: '5140 x 1928 x 1890 mm',
    cylinders: '4 Silindir', engineVolume: '1950 cc', enginePower: '190 HP', torque: '440 Nm', weight: '2100 kg', drivetrain: 'Arkadan İtiş'
  },
  'Volkswagen_Amarok Aventura': {
    maxSpeed: '180 km/s', acceleration: '9.0 sn', cityFuel: '9.5 L', highwayFuel: '7.5 L', combinedFuel: '8.2 L',
    tankCapacity: '80 L', trunkCapacity: '1100 kg', wheels: '255/50 R20', dimensions: '5254 x 1954 x 1834 mm',
    cylinders: '6 Silindir', engineVolume: '2967 cc', enginePower: '258 HP', torque: '580 Nm', weight: '2350 kg', drivetrain: 'Dört Çeker (4WD)'
  },
  'BMW_3.20i': {
    maxSpeed: '230 km/s', acceleration: '7.6 sn', cityFuel: '7.7 L', highwayFuel: '5.1 L', combinedFuel: '6.0 L',
    tankCapacity: '59 L', trunkCapacity: '480 L', wheels: '225/45 R18', dimensions: '4709 x 1827 x 1435 mm',
    cylinders: '4 Silindir', engineVolume: '1597 cc', enginePower: '170 HP', torque: '250 Nm', weight: '1525 kg', drivetrain: 'Arkadan İtiş'
  },
  'Ford_Focus': {
    maxSpeed: '193 km/s', acceleration: '10.5 sn', cityFuel: '4.3 L', highwayFuel: '3.4 L', combinedFuel: '3.8 L',
    tankCapacity: '53 L', trunkCapacity: '316 L', wheels: '205/55 R16', dimensions: '4360 x 1823 x 1469 mm',
    cylinders: '4 Silindir', engineVolume: '1499 cc', enginePower: '120 HP', torque: '300 Nm', weight: '1350 kg', drivetrain: 'Önden Çekiş'
  },
  'Audi_A3': {
    maxSpeed: '224 km/s', acceleration: '8.4 sn', cityFuel: '6.2 L', highwayFuel: '4.2 L', combinedFuel: '4.9 L',
    tankCapacity: '50 L', trunkCapacity: '380 L', wheels: '225/45 R17', dimensions: '4343 x 1816 x 1449 mm',
    cylinders: '4 Silindir', engineVolume: '1498 cc', enginePower: '150 HP', torque: '250 Nm', weight: '1395 kg', drivetrain: 'Önden Çekiş'
  },
  'Volvo_S90': {
    maxSpeed: '180 km/s', acceleration: '7.0 sn', cityFuel: '6.0 L', highwayFuel: '4.5 L', combinedFuel: '5.0 L',
    tankCapacity: '60 L', trunkCapacity: '500 L', wheels: '245/45 R18', dimensions: '4969 x 1879 x 1440 mm',
    cylinders: '4 Silindir', engineVolume: '1969 cc', enginePower: '235 HP', torque: '480 Nm', weight: '1850 kg', drivetrain: 'Dört Çeker (AWD)'
  }
};

export function getTechnicalSpecs(brand: string, model: string): TechnicalSpecs | null {
  const key = `${brand}_${model}`;
  return CAR_SPECS_DB[key] || null;
}
