/** @jest-environment jsdom */
import React from "react";
import {render, screen} from "@testing-library/react";
import HomePage from "./HomePage";

describe("HomePage", () => {
  test("hero shows channel image, title, and description; nav present", () => {
    render(
      <HomePage
        channel={{
          title: "My Test Feed",
          description: "A feed about testing",
          image: "https://cdn.example.com/banner.png",
        }}
        items={[]}
        navTypes={[{name: "blog_article", label: "Blog", href: "/blog/"}]}
      />,
    );

    expect(screen.getByRole("heading", {name: "My Test Feed"})).toBeInTheDocument();
    expect(screen.getByText("A feed about testing")).toBeInTheDocument();
    const banner = screen.getAllByRole("img").find((img) => img.getAttribute("src") === "https://cdn.example.com/banner.png");
    expect(banner).toBeTruthy();
    expect(screen.getByRole("link", {name: "Blog"})).toHaveAttribute("href", "/blog/");
  });

  test("text-only hero when channel.image is empty", () => {
    render(
      <HomePage
        channel={{title: "My Test Feed", description: "A feed about testing", image: ""}}
        items={[]}
        navTypes={[]}
      />,
    );

    expect(screen.getByRole("heading", {name: "My Test Feed"})).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  test("feed renders one card per item with correct href and type badge", () => {
    render(
      <HomePage
        channel={{title: "My Test Feed"}}
        items={[
          {content_type: "blog_article", slug: "article-one", title: "Article One"},
          {content_type: "photo", slug: "photo-one", caption: "Photo One"},
          {content_type: "podcast_episode", slug: "cast-episode", title: "Cast Episode"},
        ]}
        navTypes={[]}
      />,
    );

    expect(screen.getByRole("link", {name: /Article One/})).toHaveAttribute("href", "/blog/article-one");
    expect(screen.getByRole("link", {name: /Photo One/})).toHaveAttribute("href", "/photo/photo-one");
    expect(screen.getByRole("link", {name: /Cast Episode/})).toHaveAttribute("href", "/i/cast-episode");
    expect(screen.getByText("Blog")).toBeInTheDocument();
    expect(screen.getByText("Photo")).toBeInTheDocument();
    expect(screen.getByText("Podcast")).toBeInTheDocument();
  });
});
