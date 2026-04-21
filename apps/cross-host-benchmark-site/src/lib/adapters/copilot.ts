import type {
  RepoPresentationModel,
  RepoSnapshotBundle,
} from "../presentation/contracts";
import { buildRepoPresentation } from "../presentation/primitives";

export const adaptCopilotPresentation = (
  bundle: RepoSnapshotBundle,
): RepoPresentationModel => {
  if (bundle.repo !== "oh-my-copilot") {
    throw new Error(`Copilot adapter cannot read repo '${bundle.repo}'.`);
  }

  return buildRepoPresentation(
    bundle,
    "vanilla",
    "State confidence for install, contract, and validation checks",
  );
};
