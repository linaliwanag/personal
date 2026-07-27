export const getVinylColor = (title) => {
  switch (title) {
    case "About": return "linear-gradient(145deg, #343465, #443499)";
    case "Projects": return "linear-gradient(145deg, #653434, #994434)";
    case "Contact": return "linear-gradient(145deg, #346534, #449934)";
    default: return "linear-gradient(145deg, #444, #222)";
  }
};
