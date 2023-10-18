export const _uid = (ip: string | undefined, port: number | undefined) => {
    if (!ip || !port) return ""
    return `${ip}:${port}`
}