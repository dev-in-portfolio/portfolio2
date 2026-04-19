const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
  eleventyConfig.addNunjucksFilter("date", (value, format = "yyyy") => {
    const normalized = value === "now" || value == null ? new Date() : (value instanceof Date ? value : new Date(value));
    if (Number.isNaN(normalized.getTime())) return "";
    const luxonFormat = format === "%Y" ? "yyyy" : format;
    return DateTime.fromJSDate(normalized).toFormat(luxonFormat);
  });

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  eleventyConfig.addCollection("specs", (collectionApi) => {
    const data = collectionApi.getAll()[0]?.data?.specs || [];
    return data;
  });

  eleventyConfig.addCollection("tagList", (collectionApi) => {
    const data = collectionApi.getAll()[0]?.data?.specs || [];
    const tags = new Set();
    data.forEach((item) => (item.tags || []).forEach((tag) => tags.add(tag)));
    return [...tags].sort();
  });

  eleventyConfig.addCollection("statusList", (collectionApi) => {
    const data = collectionApi.getAll()[0]?.data?.specs || [];
    const statuses = new Set();
    data.forEach((item) => item.status && statuses.add(item.status));
    return [...statuses].sort();
  });

  eleventyConfig.addCollection("ownerList", (collectionApi) => {
    const data = collectionApi.getAll()[0]?.data?.specs || [];
    const owners = new Set();
    data.forEach((item) => item.owner && owners.add(item.owner));
    return [...owners].sort();
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
