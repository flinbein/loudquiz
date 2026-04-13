export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    if (Object.hasOwn(vars, key)) return vars[key] as string;
    return match;
  });
}
