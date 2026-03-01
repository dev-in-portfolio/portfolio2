module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  eleventyConfig.addCollection("specs", (collectionApi) => {
    const data = collectionApi.getAll()[0].data.specs || [];
    return data;
  });

  eleventyConfig.addCollection("tagList", (collectionApi) => {
    const data = collectionApi.getAll()[0].data.specs || [];
    const tags = new Set();
    data.forEach((item) => item.tags.forEach((tag) => tags.add(tag)));
    return [...tags].sort();
  });

  eleventyConfig.addCollection("statusList", (collectionApi) => {
    const data = collectionApi.getAll()[0].data.specs || [];
    const statuses = new Set();
    data.forEach((item) => statuses.add(item.status));
    return [...statuses].sort();
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
  };
}
