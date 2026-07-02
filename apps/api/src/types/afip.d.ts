declare module '@afipsdk/afip.js' {
  interface AfipOptions {
    CUIT: number;
    cert: string;
    key: string;
    production?: boolean;
  }

  interface VoucherResult {
    CAE: string;
    CAEFchVto: string;
  }

  interface ElectronicBilling {
    getLastVoucher(pointOfSale: number, voucherType: number): Promise<number>;
    createVoucher(data: Record<string, unknown>): Promise<VoucherResult>;
  }

  export default class Afip {
    ElectronicBilling: ElectronicBilling;
    constructor(options: AfipOptions);
  }
}
