import type {
  RepoPresentationModel,
  RepoSnapshotBundle,
} from "../presentation/contracts";
import { buildRepoPresentation } from "../presentation/primitives";

export const adaptCursorPresentation = (
  bundle: RepoSnapshotBundle,
): RepoPresentationModel => {
  if (bundle.repo !== "oh-my-cursor") {
    throw new Error(`Cursor adapter cannot read repo '${bundle.repo}'.`);
  }

  return buildRepoPresentation(
    bundle,
    "baseline",
    "State confidence for auth, visibility, contract, and smoke checks",
  );
};
