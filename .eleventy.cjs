module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  eleventyConfig.addCollection("targets", (collectionApi) => {
    const data = collectionApi.getAll()[0].data.targets || [];
    return data;
  });

  eleventyConfig.addCollection("tagList", (collectionApi) => {
    const data = collectionApi.getAll()[0].data.targets || [];
    const tags = new Set();
    data.forEach((item) => item.tags.forEach((tag) => tags.add(tag)));
    return [...tags].sort();
  });

  eleventyConfig.addCollection("kindList", (collectionApi) => {
    const data = collectionApi.getAll()[0].data.targets || [];
    const kinds = new Set();
    data.forEach((item) => kinds.add(item.kind));
    return [...kinds].sort();
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
