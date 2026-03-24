/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CompanyValuation {
  id: string;
  name: string;
  nameZh: string;
  ticker: string;
  type: 'US' | 'ADR';
  marketCap: string;
  peTtm: number;
  peFwd: number;
  pb: number;
  peg: number;
  oneYearPeChange: number;
  pePercentile10y: number;
  status: 'Low' | 'Neutral' | 'High';
  logo?: string;
  price?: number;
}

export interface IndexValuation {
  id: string;
  name: string;
  nameZh: string;
  ticker: string;
  type: 'Core' | 'Sector';
  peTtm: number;
  peFwd: number;
  pb: number;
  oneYearPeChange: number;
  pePercentile: number;
  dataRange: string;
  status: 'Low' | 'Neutral' | 'High';
  price?: number;
}

export interface HistoricalDataPoint {
  date: string;
  peTtm: number;
  percentile: number;
}

const rawCompanies: Partial<CompanyValuation>[] = [
  { id: 'nvda', name: 'NVIDIA', nameZh: '英伟达', ticker: 'NVDA', type: 'US', marketCap: '$4.37T', peTtm: 36.65, peFwd: 21.79, pb: 27.76, peg: 1.11, oneYearPeChange: -5.5, pePercentile10y: 12.5, status: 'Low' },
  { id: 'aapl', name: 'Apple', nameZh: '苹果', ticker: 'AAPL', type: 'US', marketCap: '$3.86T', peTtm: 33.21, peFwd: 30.49, pb: 43.67, peg: 2.37, oneYearPeChange: -12.2, pePercentile10y: 82.2, status: 'Neutral' },
  { id: 'googl', name: 'Alphabet (Google)', nameZh: '谷歌', ticker: 'GOOGL', type: 'US', marketCap: '$3.64T', peTtm: 27.86, peFwd: 22.43, pb: 8.76, peg: 2.31, oneYearPeChange: 32.9, pePercentile10y: 48.3, status: 'Neutral' },
  { id: 'msft', name: 'Microsoft', nameZh: '微软', ticker: 'MSFT', type: 'US', marketCap: '$2.98T', peTtm: 25.05, peFwd: 22.82, pb: 7.61, peg: 1.30, oneYearPeChange: -19.9, pePercentile10y: 7.6, status: 'Low' },
  { id: 'amzn', name: 'Amazon', nameZh: '亚马逊', ticker: 'AMZN', type: 'US', marketCap: '$2.21T', peTtm: 28.73, peFwd: 26.71, pb: 5.38, peg: 1.91, oneYearPeChange: -22.6, pePercentile10y: 0.6, status: 'Low' },
  { id: 'tsm', name: 'TSMC', nameZh: '台积电', ticker: 'TSM', type: 'ADR', marketCap: '$1.83T', peTtm: 35.39, peFwd: 26.06, pb: 11.07, peg: 1.29, oneYearPeChange: 38.3, pePercentile10y: 98.5, status: 'High' },
  { id: 'meta', name: 'Meta Platforms', nameZh: 'Meta', ticker: 'META', type: 'US', marketCap: '$1.65T', peTtm: 27.70, peFwd: 21.53, pb: 7.58, peg: 1.06, oneYearPeChange: 1.2, pePercentile10y: 44.9, status: 'Neutral' },
  { id: 'avgo', name: 'Broadcom', nameZh: '博通', ticker: 'AVGO', type: 'US', marketCap: '$1.49T', peTtm: 65.89, peFwd: 30.35, pb: 18.31, peg: 0.89, oneYearPeChange: -27.1, pePercentile10y: 64.6, status: 'Neutral' },
  { id: 'tsla', name: 'Tesla', nameZh: '特斯拉', ticker: 'TSLA', type: 'US', marketCap: '$1.47T', peTtm: 361.51, peFwd: 188.80, pb: 17.84, peg: 5.65, oneYearPeChange: 165.8, pePercentile10y: 43.2, status: 'Neutral' },
  { id: 'brk-b', name: 'Berkshire Hathaway', nameZh: '伯克希尔哈撒韦', ticker: 'BRK-B', type: 'US', marketCap: '$1.03T', peTtm: 15.41, peFwd: 19.93, pb: 1.44, peg: 0, oneYearPeChange: 24.7, pePercentile10y: 56.9, status: 'Neutral' },
  { id: 'wmt', name: 'Walmart', nameZh: '沃尔玛', ticker: 'WMT', type: 'US', marketCap: '$1.01T', peTtm: 46.24, peFwd: 43.28, pb: 10.51, peg: 4.73, oneYearPeChange: 14.1, pePercentile10y: 91.5, status: 'High' },
  { id: 'lly', name: 'Eli Lilly', nameZh: '礼来', ticker: 'LLY', type: 'US', marketCap: '$898.97B', peTtm: 43.77, peFwd: 28.96, pb: 35.72, peg: 1.09, oneYearPeChange: -45.9, pePercentile10y: 50.0, status: 'Neutral' },
  { id: 'jpm', name: 'JPMorgan Chase', nameZh: '摩根大通', ticker: 'JPM', type: 'US', marketCap: '$750.2B', peTtm: 12.4, peFwd: 11.8, pb: 1.8, peg: 1.2, oneYearPeChange: 15.2, pePercentile10y: 78.5, status: 'Neutral' },
  { id: 'v', name: 'Visa', nameZh: '维萨', ticker: 'V', type: 'US', marketCap: '$620.5B', peTtm: 28.5, peFwd: 24.2, pb: 12.4, peg: 1.8, oneYearPeChange: -5.2, pePercentile10y: 35.4, status: 'Neutral' },
  { id: 'ma', name: 'Mastercard', nameZh: '万事达卡', ticker: 'MA', type: 'US', marketCap: '$510.8B', peTtm: 32.1, peFwd: 28.4, pb: 45.2, peg: 2.1, oneYearPeChange: 2.4, pePercentile10y: 42.1, status: 'Neutral' },
  { id: 'unh', name: 'UnitedHealth', nameZh: '联合健康', ticker: 'UNH', type: 'US', marketCap: '$495.2B', peTtm: 22.4, peFwd: 18.5, pb: 5.4, peg: 1.4, oneYearPeChange: -8.5, pePercentile10y: 22.1, status: 'Low' },
  { id: 'hd', name: 'Home Depot', nameZh: '家得宝', ticker: 'HD', type: 'US', marketCap: '$410.5B', peTtm: 24.2, peFwd: 22.1, pb: 18.5, peg: 2.4, oneYearPeChange: 12.4, pePercentile10y: 65.4, status: 'Neutral' },
  { id: 'pg', name: 'Procter & Gamble', nameZh: '宝洁', ticker: 'PG', type: 'US', marketCap: '$395.8B', peTtm: 26.5, peFwd: 24.8, pb: 7.8, peg: 3.2, oneYearPeChange: 5.4, pePercentile10y: 88.2, status: 'High' },
  { id: 'jnj', name: 'Johnson & Johnson', nameZh: '强生', ticker: 'JNJ', type: 'US', marketCap: '$385.2B', peTtm: 15.8, peFwd: 14.2, pb: 5.2, peg: 2.1, oneYearPeChange: -12.4, pePercentile10y: 15.4, status: 'Low' },
  { id: 'asml', name: 'ASML', nameZh: '阿斯麦', ticker: 'ASML', type: 'ADR', marketCap: '$375.4B', peTtm: 42.1, peFwd: 32.5, pb: 12.4, peg: 1.5, oneYearPeChange: 22.4, pePercentile10y: 72.1, status: 'Neutral' },
  { id: 'cost', name: 'Costco', nameZh: '开市客', ticker: 'COST', type: 'US', marketCap: '$365.2B', peTtm: 52.4, peFwd: 48.5, pb: 15.2, peg: 4.2, oneYearPeChange: 32.4, pePercentile10y: 95.4, status: 'High' },
  { id: 'abbv', name: 'AbbVie', nameZh: '艾伯维', ticker: 'ABBV', type: 'US', marketCap: '$345.8B', peTtm: 18.5, peFwd: 15.2, pb: 12.4, peg: 1.8, oneYearPeChange: 8.5, pePercentile10y: 52.1, status: 'Neutral' },
  { id: 'crm', name: 'Salesforce', nameZh: '赛富时', ticker: 'CRM', type: 'US', marketCap: '$325.4B', peTtm: 45.2, peFwd: 32.4, pb: 5.4, peg: 1.4, oneYearPeChange: -15.2, pePercentile10y: 28.4, status: 'Neutral' },
  { id: 'orcl', name: 'Oracle', nameZh: '甲骨文', ticker: 'ORCL', type: 'US', marketCap: '$315.8B', peTtm: 32.4, peFwd: 25.2, pb: 25.4, peg: 1.9, oneYearPeChange: 45.2, pePercentile10y: 92.1, status: 'High' },
  { id: 'amd', name: 'AMD', nameZh: '超威半导体', ticker: 'AMD', type: 'US', marketCap: '$305.2B', peTtm: 120.4, peFwd: 45.2, pb: 5.2, peg: 0.8, oneYearPeChange: -22.4, pePercentile10y: 32.1, status: 'Neutral' },
  { id: 'nflx', name: 'Netflix', nameZh: '奈飞', ticker: 'NFLX', type: 'US', marketCap: '$295.8B', peTtm: 42.1, peFwd: 32.4, pb: 12.4, peg: 1.2, oneYearPeChange: 52.4, pePercentile10y: 68.4, status: 'Neutral' },
  { id: 'cvx', name: 'Chevron', nameZh: '雪佛龙', ticker: 'CVX', type: 'US', marketCap: '$285.2B', peTtm: 12.4, peFwd: 11.5, pb: 1.8, peg: 2.1, oneYearPeChange: -5.4, pePercentile10y: 42.1, status: 'Neutral' },
  { id: 'mrk', name: 'Merck', nameZh: '默沙东', ticker: 'MRK', type: 'US', marketCap: '$275.8B', peTtm: 18.5, peFwd: 14.2, pb: 5.4, peg: 1.5, oneYearPeChange: 12.4, pePercentile10y: 58.4, status: 'Neutral' },
  { id: 'bac', name: 'Bank of America', nameZh: '美国银行', ticker: 'BAC', type: 'US', marketCap: '$265.2B', peTtm: 11.4, peFwd: 10.2, pb: 1.2, peg: 1.4, oneYearPeChange: 18.5, pePercentile10y: 82.1, status: 'Neutral' },
  { id: 'pep', name: 'PepsiCo', nameZh: '百事公司', ticker: 'PEP', type: 'US', marketCap: '$255.8B', peTtm: 25.4, peFwd: 22.1, pb: 12.4, peg: 2.8, oneYearPeChange: -2.4, pePercentile10y: 45.2, status: 'Neutral' },
  { id: 'ko', name: 'Coca-Cola', nameZh: '可口可乐', ticker: 'KO', type: 'US', marketCap: '$245.2B', peTtm: 24.2, peFwd: 21.5, pb: 10.2, peg: 3.1, oneYearPeChange: 5.2, pePercentile10y: 52.4, status: 'Neutral' },
  { id: 'tmo', name: 'Thermo Fisher', nameZh: '赛默飞世尔', ticker: 'TMO', type: 'US', marketCap: '$235.8B', peTtm: 32.4, peFwd: 25.2, pb: 5.4, peg: 1.8, oneYearPeChange: -8.5, pePercentile10y: 38.4, status: 'Neutral' },
  { id: 'lin', name: 'Linde', nameZh: '林德', ticker: 'LIN', type: 'US', marketCap: '$225.2B', peTtm: 35.2, peFwd: 28.4, pb: 5.2, peg: 2.4, oneYearPeChange: 15.2, pePercentile10y: 78.4, status: 'Neutral' },
  { id: 'adi', name: 'Analog Devices', nameZh: '亚德诺', ticker: 'ADI', type: 'US', marketCap: '$215.8B', peTtm: 38.4, peFwd: 28.2, pb: 4.2, peg: 1.5, oneYearPeChange: 12.4, pePercentile10y: 62.1, status: 'Neutral' },
  { id: 'csco', name: 'Cisco', nameZh: '思科', ticker: 'CSCO', type: 'US', marketCap: '$205.2B', peTtm: 15.2, peFwd: 13.4, pb: 4.2, peg: 2.1, oneYearPeChange: -5.2, pePercentile10y: 22.4, status: 'Low' },
  { id: 'mcd', name: 'McDonald\'s', nameZh: '麦当劳', ticker: 'MCD', type: 'US', marketCap: '$195.8B', peTtm: 25.4, peFwd: 22.1, pb: 0, peg: 2.8, oneYearPeChange: 8.5, pePercentile10y: 58.4, status: 'Neutral' },
  { id: 'abt', name: 'Abbott Labs', nameZh: '雅培', ticker: 'ABT', type: 'US', marketCap: '$185.2B', peTtm: 28.4, peFwd: 22.4, pb: 5.2, peg: 1.9, oneYearPeChange: -12.4, pePercentile10y: 28.4, status: 'Neutral' },
  { id: 'dis', name: 'Disney', nameZh: '迪士尼', ticker: 'DIS', type: 'US', marketCap: '$175.8B', peTtm: 45.2, peFwd: 22.1, pb: 2.4, peg: 1.2, oneYearPeChange: 32.4, pePercentile10y: 42.1, status: 'Neutral' },
  { id: 'intu', name: 'Intuit', nameZh: '因图特', ticker: 'INTU', type: 'US', marketCap: '$165.2B', peTtm: 55.2, peFwd: 35.4, pb: 12.4, peg: 2.1, oneYearPeChange: 18.5, pePercentile10y: 85.4, status: 'High' },
  { id: 'qcom', name: 'Qualcomm', nameZh: '高通', ticker: 'QCOM', type: 'US', marketCap: '$155.8B', peTtm: 18.5, peFwd: 14.2, pb: 8.4, peg: 1.1, oneYearPeChange: 25.4, pePercentile10y: 72.1, status: 'Neutral' },
  { id: 'tm', name: 'Toyota', nameZh: '丰田', ticker: 'TM', type: 'ADR', marketCap: '$280.4B', peTtm: 10.2, peFwd: 9.5, pb: 1.1, peg: 1.2, oneYearPeChange: 12.4, pePercentile10y: 65.4, status: 'Neutral' },
  { id: 'nvo', name: 'Novo Nordisk', nameZh: '诺和诺德', ticker: 'NVO', type: 'ADR', marketCap: '$550.2B', peTtm: 45.2, peFwd: 32.4, pb: 35.2, peg: 1.8, oneYearPeChange: 42.4, pePercentile10y: 92.1, status: 'High' },
  { id: 'sap', name: 'SAP', nameZh: '思爱普', ticker: 'SAP', type: 'ADR', marketCap: '$220.8B', peTtm: 35.4, peFwd: 28.2, pb: 5.4, peg: 1.5, oneYearPeChange: 28.4, pePercentile10y: 78.4, status: 'Neutral' },
  { id: 'azn', name: 'AstraZeneca', nameZh: '阿斯利康', ticker: 'AZN', type: 'ADR', marketCap: '$210.5B', peTtm: 32.4, peFwd: 18.5, pb: 5.2, peg: 1.2, oneYearPeChange: 5.4, pePercentile10y: 45.2, status: 'Neutral' },
  { id: 'hdb', name: 'HDFC Bank', nameZh: 'HDFC银行', ticker: 'HDB', type: 'ADR', marketCap: '$160.2B', peTtm: 18.5, peFwd: 15.2, pb: 2.8, peg: 1.1, oneYearPeChange: -12.4, pePercentile10y: 12.4, status: 'Low' },
  { id: 'shel', name: 'Shell', nameZh: '壳牌', ticker: 'SHEL', type: 'ADR', marketCap: '$205.8B', peTtm: 8.5, peFwd: 7.8, pb: 1.1, peg: 1.5, oneYearPeChange: 2.4, pePercentile10y: 35.4, status: 'Neutral' },
  { id: 'nvs', name: 'Novartis', nameZh: '诺华', ticker: 'NVS', type: 'ADR', marketCap: '$200.2B', peTtm: 15.4, peFwd: 13.2, pb: 4.2, peg: 1.8, oneYearPeChange: 8.5, pePercentile10y: 52.1, status: 'Neutral' },
  { id: 'baba', name: 'Alibaba', nameZh: '阿里巴巴', ticker: 'BABA', type: 'ADR', marketCap: '$190.5B', peTtm: 12.4, peFwd: 9.5, pb: 1.2, peg: 0.8, oneYearPeChange: -25.4, pePercentile10y: 5.4, status: 'Low' },
  { id: 'pdd', name: 'PDD Holdings', nameZh: '拼多多', ticker: 'PDD', type: 'ADR', marketCap: '$180.2B', peTtm: 15.2, peFwd: 11.4, pb: 5.4, peg: 0.5, oneYearPeChange: -18.5, pePercentile10y: 15.2, status: 'Low' },
  { id: 'hsbc', name: 'HSBC', nameZh: '汇丰', ticker: 'HSBC', type: 'ADR', marketCap: '$170.8B', peTtm: 7.5, peFwd: 6.8, pb: 0.9, peg: 1.2, oneYearPeChange: 15.2, pePercentile10y: 72.4, status: 'Neutral' },
];

// Generate the rest to reach 100
const tickerNames: Record<string, { en: string, zh: string }> = {
  'CAT': { en: 'Caterpillar', zh: '卡特彼勒' },
  'GE': { en: 'General Electric', zh: '通用电气' },
  'IBM': { en: 'IBM', zh: '国际商业机器' },
  'AMAT': { en: 'Applied Materials', zh: '应用材料' },
  'TXN': { en: 'Texas Instruments', zh: '德州仪器' },
  'NOW': { en: 'ServiceNow', zh: 'ServiceNow' },
  'ISRG': { en: 'Intuitive Surgical', zh: '直觉外科' },
  'BKNG': { en: 'Booking Holdings', zh: 'Booking' },
  'GS': { en: 'Goldman Sachs', zh: '高盛' },
  'MS': { en: 'Morgan Stanley', zh: '摩根士丹利' },
  'RTX': { en: 'Raytheon Technologies', zh: '雷神技术' },
  'HON': { en: 'Honeywell', zh: '霍尼韦尔' },
  'PFE': { en: 'Pfizer', zh: '辉瑞' },
  'AMGN': { en: 'Amgen', zh: '安进' },
  'T': { en: 'AT&T', zh: 'AT&T' },
  'VZ': { en: 'Verizon', zh: '威瑞森' },
  'CMCSA': { en: 'Comcast', zh: '康卡斯特' },
  'NEE': { en: 'NextEra Energy', zh: '新时代能源' },
  'PM': { en: 'Philip Morris', zh: '菲利普莫里斯' },
  'UNP': { en: 'Union Pacific', zh: '联合太平洋' },
  'LOW': { en: 'Lowe\'s', zh: '劳氏' },
  'SPGI': { en: 'S&P Global', zh: '标普全球' },
  'INTC': { en: 'Intel', zh: '英特尔' },
  'COP': { en: 'ConocoPhillips', zh: '康菲石油' },
  'SYK': { en: 'Stryker', zh: '史赛克' },
  'UPS': { en: 'UPS', zh: '联合包裹' },
  'ELV': { en: 'Elevance Health', zh: '依利安斯' },
  'BA': { en: 'Boeing', zh: '波音' },
  'MDT': { en: 'Medtronic', zh: '美敦力' },
  'LMT': { en: 'Lockheed Martin', zh: '洛克希德马丁' },
  'TJX': { en: 'TJX Companies', zh: 'TJX公司' },
  'AXP': { en: 'American Express', zh: '美国运通' },
  'DE': { en: 'Deere & Co', zh: '迪尔公司' },
  'C': { en: 'Citigroup', zh: '花旗集团' },
  'PLD': { en: 'Prologis', zh: '普洛斯' },
  'CB': { en: 'Chubb', zh: '安达保险' },
  'ABNB': { en: 'Airbnb', zh: '爱彼迎' },
  'MDLZ': { en: 'Mondelez', zh: '亿滋国际' },
  'CI': { en: 'Cigna', zh: '信诺' },
  'ZTS': { en: 'Zoetis', zh: '硕腾' },
  'REGN': { en: 'Regeneron', zh: '再生元制药' },
  'GILD': { en: 'Gilead Sciences', zh: '吉利德科学' },
  'VRTX': { en: 'Vertex Pharma', zh: '福泰制药' },
  'MMC': { en: 'Marsh & McLennan', zh: '威达信' },
  'AMT': { en: 'American Tower', zh: '美国塔塔' },
  'BSX': { en: 'Boston Scientific', zh: '波士顿科学' },
  'PANW': { en: 'Palo Alto Networks', zh: '派拓网络' },
  'SNPS': { en: 'Synopsys', zh: '新思科技' },
  'CDNS': { en: 'Cadence Design', zh: '楷登电子' },
  'KLAC': { en: 'KLA Corp', zh: '科磊' }
};

const tickers = Object.keys(tickerNames);
tickers.forEach((ticker, index) => {
  if (rawCompanies.length < 100) {
    const info = tickerNames[ticker];
    rawCompanies.push({
      id: ticker.toLowerCase(),
      name: info.en,
      nameZh: info.zh,
      ticker: ticker,
      type: 'US',
      marketCap: `$${(150 - index).toFixed(1)}B`,
      peTtm: 15 + Math.random() * 30,
      peFwd: 12 + Math.random() * 25,
      pb: 1 + Math.random() * 10,
      peg: 0.5 + Math.random() * 2,
      oneYearPeChange: (Math.random() - 0.5) * 40,
      pePercentile10y: Math.floor(Math.random() * 100),
      status: Math.random() > 0.7 ? 'High' : (Math.random() > 0.4 ? 'Neutral' : 'Low')
    });
  }
});

export const TOP_COMPANIES = rawCompanies.map(c => ({
  ...c,
  oneYearPeChange: parseFloat(c.oneYearPeChange?.toFixed(1) || '0'),
  peTtm: parseFloat(c.peTtm?.toFixed(2) || '0'),
  peFwd: parseFloat(c.peFwd?.toFixed(2) || '0'),
  pb: parseFloat(c.pb?.toFixed(2) || '0'),
  peg: parseFloat(c.peg?.toFixed(2) || '0'),
})) as CompanyValuation[];

export const INDICES: IndexValuation[] = [
  { id: 'spy', name: 'S&P 500', nameZh: '标普500指数', ticker: 'SPY', type: 'Core', peTtm: 24.75, peFwd: 21.46, pb: 4.47, oneYearPeChange: 1.8, pePercentile: 84.3, dataRange: '2005-02-25 ~ 2026-03-03', status: 'Neutral', price: 0 },
  { id: 'qqq', name: 'Nasdaq 100', nameZh: '纳斯达克100指数', ticker: 'QQQ', type: 'Core', peTtm: 30.78, peFwd: 27.44, pb: 7.32, oneYearPeChange: 1.3, pePercentile: 71.1, dataRange: '1999-03-10 ~ 2026-03-03', status: 'Neutral', price: 0 },
  { id: 'dia', name: 'Dow Jones 30', nameZh: '道琼斯工业平均指数', ticker: 'DIA', type: 'Core', peTtm: 23.24, peFwd: 19.94, pb: 4.87, oneYearPeChange: -1.8, pePercentile: 79.0, dataRange: '2005-02-25 ~ 2026-03-03', status: 'Neutral', price: 0 },
  { id: 'iwm', name: 'Russell 2000', nameZh: '罗素2000指数', ticker: 'IWM', type: 'Core', peTtm: 36.89, peFwd: 24.93, pb: 3.42, oneYearPeChange: 19.7, pePercentile: 56.7, dataRange: '2005-02-25 ~ 2026-03-03', status: 'Neutral', price: 0 },
  { id: 'vti', name: 'Total Stock Market', nameZh: '全美股市指数', ticker: 'VTI', type: 'Core', peTtm: 24.12, peFwd: 20.85, pb: 4.15, oneYearPeChange: 2.1, pePercentile: 82.5, dataRange: '2005-02-25 ~ 2026-03-03', status: 'Neutral', price: 0 },
  { id: 'xlk', name: 'Information Technology', nameZh: '信息技术指数', ticker: 'XLK', type: 'Sector', peTtm: 34.82, peFwd: 23.59, pb: 9.10, oneYearPeChange: 0.7, pePercentile: 92.8, dataRange: '2005-02-25 ~ 2026-03-03', status: 'High', price: 0 },
  { id: 'xlf', name: 'Financials', nameZh: '金融指数', ticker: 'XLF', type: 'Sector', peTtm: 17.18, peFwd: 14.66, pb: 1.99, oneYearPeChange: 2.5, pePercentile: 93.0, dataRange: '2005-02-25 ~ 2026-03-03', status: 'High', price: 0 },
  { id: 'xlv', name: 'Health Care', nameZh: '医疗保健指数', ticker: 'XLV', type: 'Sector', peTtm: 22.45, peFwd: 18.32, pb: 4.85, oneYearPeChange: -3.2, pePercentile: 45.6, dataRange: '2005-02-25 ~ 2026-03-03', status: 'Neutral', price: 0 },
  { id: 'xly', name: 'Consumer Discretionary', nameZh: '可选消费指数', ticker: 'XLY', type: 'Sector', peTtm: 28.91, peFwd: 24.15, pb: 6.72, oneYearPeChange: 5.4, pePercentile: 68.2, dataRange: '2005-02-25 ~ 2026-03-03', status: 'Neutral', price: 0 },
  { id: 'xlp', name: 'Consumer Staples', nameZh: '必需消费指数', ticker: 'XLP', type: 'Sector', peTtm: 20.12, peFwd: 18.54, pb: 5.14, oneYearPeChange: -1.5, pePercentile: 32.4, dataRange: '2005-02-25 ~ 2026-03-03', status: 'Low', price: 0 },
  { id: 'xle', name: 'Energy', nameZh: '能源指数', ticker: 'XLE', type: 'Sector', peTtm: 12.34, peFwd: 11.05, pb: 2.15, oneYearPeChange: -15.6, pePercentile: 18.5, dataRange: '2005-02-25 ~ 2026-03-03', status: 'Low', price: 0 },
  { id: 'xli', name: 'Industrials', nameZh: '工业指数', ticker: 'XLI', type: 'Sector', peTtm: 21.56, peFwd: 19.23, pb: 4.67, oneYearPeChange: 8.2, pePercentile: 75.4, dataRange: '2005-02-25 ~ 2026-03-03', status: 'Neutral', price: 0 },
  { id: 'xlb', name: 'Materials', nameZh: '材料指数', ticker: 'XLB', type: 'Sector', peTtm: 18.45, peFwd: 16.78, pb: 2.98, oneYearPeChange: -4.5, pePercentile: 42.1, dataRange: '2005-02-25 ~ 2026-03-03', status: 'Neutral', price: 0 },
  { id: 'xlre', name: 'Real Estate', nameZh: '房地产指数', ticker: 'XLRE', type: 'Sector', peTtm: 35.67, peFwd: 30.12, pb: 2.45, oneYearPeChange: 12.4, pePercentile: 88.5, dataRange: '2015-10-08 ~ 2026-03-03', status: 'High', price: 0 },
  { id: 'xlu', name: 'Utilities', nameZh: '公用事业指数', ticker: 'XLU', type: 'Sector', peTtm: 19.87, peFwd: 17.45, pb: 2.12, oneYearPeChange: -6.7, pePercentile: 25.8, dataRange: '2005-02-25 ~ 2026-03-03', status: 'Low', price: 0 },
  { id: 'xlc', name: 'Communication Services', nameZh: '通信服务指数', ticker: 'XLC', type: 'Sector', peTtm: 25.43, peFwd: 20.12, pb: 3.87, oneYearPeChange: 18.9, pePercentile: 62.3, dataRange: '2018-06-19 ~ 2026-03-03', status: 'Neutral', price: 0 },
  { id: 'soxx', name: 'Semiconductors', nameZh: '半导体指数', ticker: 'SOXX', type: 'Sector', peTtm: 45.21, peFwd: 32.15, pb: 12.4, oneYearPeChange: 45.2, pePercentile: 98.5, dataRange: '2010-01-01 ~ 2026-03-03', status: 'High', price: 0 },
  { id: 'kre', name: 'Regional Banks', nameZh: '区域银行指数', ticker: 'KRE', type: 'Sector', peTtm: 12.45, peFwd: 10.21, pb: 1.05, oneYearPeChange: -25.4, pePercentile: 12.4, dataRange: '2010-01-01 ~ 2026-03-03', status: 'Low', price: 0 },
  { id: 'ibb', name: 'Biotechnology', nameZh: '生物技术指数', ticker: 'IBB', type: 'Sector', peTtm: 28.45, peFwd: 22.14, pb: 4.5, oneYearPeChange: -12.4, pePercentile: 35.2, dataRange: '2010-01-01 ~ 2026-03-03', status: 'Neutral', price: 0 },
  { id: 'xrt', name: 'Retail', nameZh: '零售指数', ticker: 'XRT', type: 'Sector', peTtm: 22.14, peFwd: 18.45, pb: 3.2, oneYearPeChange: 5.4, pePercentile: 55.4, dataRange: '2010-01-01 ~ 2026-03-03', status: 'Neutral', price: 0 },
  { id: 'vnq', name: 'Vanguard Real Estate', nameZh: '先锋房地产指数', ticker: 'VNQ', type: 'Sector', peTtm: 32.14, peFwd: 28.45, pb: 2.1, oneYearPeChange: 8.5, pePercentile: 82.1, dataRange: '2010-01-01 ~ 2026-03-03', status: 'High', price: 0 },
  { id: 'vig', name: 'Dividend Appreciation', nameZh: '股息增长指数', ticker: 'VIG', type: 'Core', peTtm: 22.14, peFwd: 19.45, pb: 4.2, oneYearPeChange: 2.4, pePercentile: 65.4, dataRange: '2010-01-01 ~ 2026-03-03', status: 'Neutral', price: 0 },
  { id: 'schd', name: 'US Dividend Equity', nameZh: '美股股息指数', ticker: 'SCHD', type: 'Core', peTtm: 18.45, peFwd: 16.24, pb: 3.5, oneYearPeChange: -2.4, pePercentile: 45.2, dataRange: '2011-10-20 ~ 2026-03-03', status: 'Neutral', price: 0 },
  { id: 'arkk', name: 'Innovation', nameZh: '创新指数', ticker: 'ARKK', type: 'Sector', peTtm: 85.4, peFwd: 55.2, pb: 8.4, oneYearPeChange: 125.4, pePercentile: 95.4, dataRange: '2014-10-31 ~ 2026-03-03', status: 'High', price: 0 },
  { id: 'kweb', name: 'China Internet', nameZh: '中国互联网指数', ticker: 'KWEB', type: 'Sector', peTtm: 15.4, peFwd: 12.4, pb: 1.8, oneYearPeChange: -35.2, pePercentile: 8.5, dataRange: '2013-07-31 ~ 2026-03-03', status: 'Low', price: 0 },
  { id: 'gdx', name: 'Gold Miners', nameZh: '黄金矿业指数', ticker: 'GDX', type: 'Sector', peTtm: 25.4, peFwd: 18.5, pb: 1.5, oneYearPeChange: 45.2, pePercentile: 75.4, dataRange: '2006-05-16 ~ 2026-03-03', status: 'Neutral', price: 0 },
];

export const generateHistoricalData = (basePe: number, points: number = 240): HistoricalDataPoint[] => {
  const data: HistoricalDataPoint[] = [];
  let currentPe = basePe;
  const startDate = new Date(2006, 2, 3);

  for (let i = 0; i < points; i++) {
    const date = new Date(startDate);
    date.setMonth(startDate.getMonth() + i);
    
    // Random walk
    currentPe += (Math.random() - 0.5) * (basePe * 0.1);
    if (currentPe < basePe * 0.5) currentPe = basePe * 0.5;
    if (currentPe > basePe * 2.5) currentPe = basePe * 2.5;

    data.push({
      date: date.toISOString().split('T')[0],
      peTtm: parseFloat(currentPe.toFixed(2)),
      percentile: Math.floor(Math.random() * 100),
    });
  }
  return data;
};
