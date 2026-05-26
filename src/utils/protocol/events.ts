type Handler = (data: any) => void;

const handlers = new Map<string, Set<Handler>>();

export function subscribe(name: string, fn: Handler) {
    if (!handlers.has(name)) {
        handlers.set(name, new Set());
    }
    
    handlers.get(name)!.add(fn);
}

export function unsubscribe(name: string, fn: Handler) {
    handlers.get(name)?.delete(fn);
}

export function emit(name: string, data: any) {
    handlers.get(name)?.forEach(fn => fn(data));
}