export class Patch {
  readonly target: string;
  readonly content: string;
  readonly section?: string;

  constructor({
    target,
    content,
    section,
  }: {
    target: string;
    content: string;
    section?: string;
  }) {
    if (content.length === 0) {
      throw new Error(
        `Patch: content for "${target}" must be a non-empty string`,
      );
    }
    this.target = target;
    this.content = content;
    if (section) this.section = section;
    Object.freeze(this);
  }
}
