export type PatchOptions = {
  failIfExists?: boolean;
  jsonTarget?: string;
  sections?: string[];
  appendIfNotExists?: "None" | "End" | "Start";
};

export class Patch {
  readonly target: string;
  readonly content: string;
  readonly options?: Readonly<PatchOptions>;

  constructor({
    target,
    content,
    options,
  }: {
    target: string;
    content: string;
    options?: PatchOptions;
  }) {
    if (content.length === 0) {
      throw new Error(
        `Patch: content for "${target}" must be a non-empty string`,
      );
    }
    this.target = target;
    this.content = content;
    if (options !== undefined) {
      this.options = Object.freeze({ ...options });
    }
    Object.freeze(this);
  }
}
