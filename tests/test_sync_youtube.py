#!/usr/bin/env python3
"""YouTube sync birim testleri — ağ gerektirmez."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import sync_youtube as sy  # noqa: E402

FIXTURE = ROOT / "tests" / "fixtures" / "youtube_feed_sample.xml"


class SyncYoutubeTests(unittest.TestCase):
    def test_parse_fixture(self):
        xml_text = FIXTURE.read_text(encoding="utf-8")
        videos = sy.parse_feed(xml_text)
        self.assertGreaterEqual(len(videos), 1)
        first = videos[0]
        self.assertEqual(first["id"], "KS7XJD08C5U")
        self.assertIn("İLİÇ", first["title"])
        self.assertTrue(first["url"].startswith("https://www.youtube.com/watch?v="))
        self.assertIn("ytimg.com", first["thumbnail"])
        self.assertTrue(first["publishedAt"])

    def test_merge_dedupes_and_keeps_archive(self):
        existing = [
            {
                "id": "OLD123",
                "title": "Eski video",
                "url": "https://www.youtube.com/watch?v=OLD123",
                "publishedAt": "2020-01-01T00:00:00+00:00",
                "thumbnail": "https://i.ytimg.com/vi/OLD123/hqdefault.jpg",
                "description": "",
            }
        ]
        incoming = sy.parse_feed(FIXTURE.read_text(encoding="utf-8"))
        merged, added = sy.merge_videos(existing, incoming)
        ids = [v["id"] for v in merged]
        self.assertIn("OLD123", ids)
        self.assertIn("KS7XJD08C5U", ids)
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(added, len(incoming))
        # newest first
        self.assertEqual(merged[0]["id"], incoming[0]["id"])

    def test_merge_no_duplicate_on_second_run(self):
        incoming = sy.parse_feed(FIXTURE.read_text(encoding="utf-8"))
        merged1, added1 = sy.merge_videos([], incoming)
        merged2, added2 = sy.merge_videos(merged1, incoming)
        self.assertEqual(added1, len(incoming))
        self.assertEqual(added2, 0)
        self.assertEqual(len(merged1), len(merged2))

    def test_cli_writes_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "videos.json"
            code = sy.main(["--feed-file", str(FIXTURE), "--out", str(out)])
            self.assertEqual(code, 0)
            data = json.loads(out.read_text(encoding="utf-8"))
            self.assertEqual(data["channelId"], sy.CHANNEL_ID)
            self.assertGreaterEqual(data["count"], 1)
            # second run: no change exit 0
            code2 = sy.main(["--feed-file", str(FIXTURE), "--out", str(out)])
            self.assertEqual(code2, 0)

    def test_bad_xml_keeps_existing(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "videos.json"
            original = {"channelId": "x", "videos": [{"id": "KEEP"}], "count": 1, "updatedAt": "t"}
            out.write_text(json.dumps(original), encoding="utf-8")
            bad = Path(tmp) / "bad.xml"
            bad.write_text("<not>xml", encoding="utf-8")
            code = sy.main(["--feed-file", str(bad), "--out", str(out)])
            self.assertEqual(code, 1)
            kept = json.loads(out.read_text(encoding="utf-8"))
            self.assertEqual(kept["videos"][0]["id"], "KEEP")

    def test_new_video_added_from_fixture(self):
        existing = json.loads((ROOT / "assets" / "videos.json").read_text(encoding="utf-8"))["videos"]
        before = {v["id"] for v in existing}
        incoming = sy.parse_feed(FIXTURE.read_text(encoding="utf-8"))
        # Simulate a brand-new id on the feed
        newbie = dict(incoming[0])
        newbie["id"] = "NEWVIDEOTEST01"
        newbie["url"] = "https://www.youtube.com/watch?v=NEWVIDEOTEST01"
        newbie["thumbnail"] = "https://i.ytimg.com/vi/NEWVIDEOTEST01/hqdefault.jpg"
        merged, added = sy.merge_videos(existing, incoming + [newbie])
        self.assertEqual(added, 1)
        self.assertIn("NEWVIDEOTEST01", {v["id"] for v in merged})
        # Archive preserved
        self.assertTrue(before.issubset({v["id"] for v in merged}))

    def test_feed_omits_old_id_archive_kept(self):
        """RSS only returns ~15 items; older archive IDs must remain."""
        existing = [
            {
                "id": "ARCHIVEOLD1",
                "title": "Arşiv",
                "url": "https://www.youtube.com/watch?v=ARCHIVEOLD1",
                "publishedAt": "2019-01-01T00:00:00+00:00",
                "thumbnail": "https://i.ytimg.com/vi/ARCHIVEOLD1/hqdefault.jpg",
                "description": "",
            }
        ]
        incoming = sy.parse_feed(FIXTURE.read_text(encoding="utf-8"))
        merged, _ = sy.merge_videos(existing, incoming)
        self.assertIn("ARCHIVEOLD1", {v["id"] for v in merged})

    def test_channel_constants(self):
        self.assertEqual(sy.CHANNEL_ID, "UCzIAIU2njG3-av6aTEHSyjw")
        self.assertIn("channel_id=", sy.DEFAULT_FEED)
        self.assertIn(sy.CHANNEL_ID, sy.DEFAULT_FEED)


if __name__ == "__main__":
    unittest.main()
