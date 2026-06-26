
export type RGB = number[];

export interface IMap<T> {
    [key: string]: T;
}

export async function delay(ms: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export class CancellationToken {
    public isCancelled: boolean = false;
}
