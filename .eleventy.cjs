const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
  eleventyConfig.addNunjucksFilter("date", (value, format = "yyyy") => {
    const normalized = value === "now" || value == null ? new Date() : (value instanceof Date ? value : new Date(value));
    if (Number.isNaN(normalized.getTime())) return "";
    const luxonFormat = format === "%Y" ? "yyyy" : format;
    return DateTime.fromJSDate(normalized).toFormat(luxonFormat);
  });

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  eleventyConfig.addCollection("patches", (collectionApi) => {
    return collectionApi.getFilteredByGlob("src/patches/*.md");
  });

  eleventyConfig.addCollection("tagList", (collectionApi) => {
    const tags = new Set();
    collectionApi.getFilteredByGlob("src/patches/*.md").forEach((item) => {
      (item.data.tags || []).forEach((tag) => tags.add(tag));
    });
    return [...tags].sort();
  });

  eleventyConfig.addCollection("riskList", (collectionApi) => {
    const risks = new Set();
    collectionApi.getFilteredByGlob("src/patches/*.md").forEach((item) => {
      if (item.data.risk) risks.add(item.data.risk);
    });
    return [...risks].sort();
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
  };
};
