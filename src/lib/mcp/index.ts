import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listBabies from "./tools/list-babies";
import getWardrobe from "./tools/get-wardrobe";
import updateWardrobe from "./tools/update-wardrobe";
import getOutfitRecommendation from "./tools/get-outfit-recommendation";
import logComfortFeedback from "./tools/log-comfort-feedback";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "layerly-mcp",
  title: "Layerly",
  version: "0.1.0",
  instructions:
    "Tools for Layerly, a baby dressing assistant. Start with `list_babies` to get a baby id, then use `get_outfit_recommendation` to answer 'what should my baby wear right now?'. `get_wardrobe` and `update_wardrobe` manage which clothes the parent owns, and `log_comfort_feedback` records how the outfit felt.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listBabies, getWardrobe, updateWardrobe, getOutfitRecommendation, logComfortFeedback],
});
