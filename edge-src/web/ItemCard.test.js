/** @jest-environment jsdom */
import React from "react";
import {render, screen} from "@testing-library/react";
import ItemCard from "./ItemCard";

describe("ItemCard", () => {
  test("renders blog_article title, excerpt, thumbnail, badge, and href", () => {
    render(
      <ItemCard
        item={{
          content_type: "blog_article",
          slug: "hello-world",
          title: "Hello World",
          excerpt: "A short teaser",
          image: "https://cdn.example.com/hello.png",
        }}
      />,
    );

    expect(screen.getByText("Hello World")).toBeInTheDocument();
    expect(screen.getByText("A short teaser")).toBeInTheDocument();
    expect(screen.getByText("Blog")).toBeInTheDocument();
    const image = screen.getByRole("img");
    expect(image).toHaveAttribute("src", "https://cdn.example.com/hello.png");
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/blog/hello-world");
  });

  test("renders photo caption as text, badge, and href", () => {
    render(
      <ItemCard
        item={{
          content_type: "photo",
          slug: "sunset",
          caption: "A beautiful sunset",
          image: "https://cdn.example.com/sunset.png",
        }}
      />,
    );

    expect(screen.getByText("A beautiful sunset")).toBeInTheDocument();
    expect(screen.getByText("Photo")).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/photo/sunset");
  });

  test("renders podcast_episode title, badge, and href", () => {
    render(
      <ItemCard
        item={{
          content_type: "podcast_episode",
          slug: "episode-one",
          title: "Episode One",
          content_html: "<p>Show notes</p>",
        }}
      />,
    );

    expect(screen.getByText("Episode One")).toBeInTheDocument();
    expect(screen.getByText("Podcast")).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/i/episode-one");
  });

  test("renders gallery title, badge, and href", () => {
    render(
      <ItemCard
        item={{
          content_type: "gallery",
          slug: "vacation",
          title: "Vacation",
          image: "https://cdn.example.com/vacation-cover.png",
        }}
      />,
    );

    expect(screen.getByText("Vacation")).toBeInTheDocument();
    expect(screen.getByText("Gallery")).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/gallery/vacation");
  });

  test("handles missing thumbnail and excerpt gracefully", () => {
    render(
      <ItemCard
        item={{
          content_type: "blog_article",
          slug: "no-image",
          title: "No Image Post",
        }}
      />,
    );

    expect(screen.getByText("No Image Post")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
