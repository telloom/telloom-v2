// types/mux-node.d.ts

declare module '@mux/mux-node' {
    export namespace Webhooks {
      function verifyHeader(
        payload: string | Buffer,
        signature: string,
        secret: string
      ): any;
    }
  }