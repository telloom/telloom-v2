declare module '@mux/mux-node' {
    export default class Mux {
      static Webhooks: {
        verifyHeader(
          body: string,
          signature: string,
          secret: string
        ): any;
      };
    }
  }