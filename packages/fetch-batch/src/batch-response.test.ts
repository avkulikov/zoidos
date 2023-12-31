import { BatchResponse } from "./batch-response";

const mockedResponseData = `Preamble
can be anything and should be ignored
--batch_foobarbaz
Content-Type: application/http
Content-ID: <response-item1:12930812@barnyard.example.com>

HTTP/1.1 200 OK
Content-Type: application/json; charset=UTF-8
ETag: "etag/pony"

{
  "kind": "farm#animal",
  "etag": "etag/pony",
  "selfLink": "/farm/v1/animals/pony",
  "animalName": "pony",
  "animalAge": 34,
  "peltColor": "white"
}

--batch_foobarbaz
Content-Type: application/http; msgtype=response; msgtype is optional and even this comment should be ignored
Content-ID: response-item2:12930812@barnyard.example.com

HTTP/1.1 200 OK
Content-Type: application/json;
  charset=UTF-8
ETag: "etag/sheep"

{
  "kind": "farm#animal",
  "etag": "etag/sheep",
  "selfLink": "/farm/v1/animals/sheep",
  "animalName": "sheep",
  "animalAge": 5,
  "peltColor": "green"
}
--batch_foobarbaz
Content-Type: application/http
Content-ID: <response-item3:12930812@barnyard.example.com>

HTTP/1.1 304 Not Modified


--batch_foobarbaz--
Epilogue can be anything
and should be ignored`.replace(/\n/g, "\r\n");

describe("BatchResponse", () => {
  it("should parse a multipart/mixed response", async () => {
    const mockedResponse = new Response(mockedResponseData, {
      headers: {
        // check continuation support
        "Content-Type": `multipart/mixed;
            boundary=batch_foobarbaz`,
      },
      status: 200,
      statusText: "OK",
    });

    const batchResponse = new BatchResponse(mockedResponse);
    let count = 0;
    for await (const [contentId, response] of batchResponse) {
      expect(contentId).toBeDefined();
      expect(response).toBeDefined();
      switch (contentId) {
        case "response-item1:12930812@barnyard.example.com":
          {
            count++;
            expect(response.status).toBe(200);
            expect(response.statusText).toBe("OK");
            expect(response.headers.get("Content-Type")).toContain(
              "application/json"
            );
            expect(response.json()).resolves.toEqual({
              kind: "farm#animal",
              etag: "etag/pony",
              selfLink: "/farm/v1/animals/pony",
              animalName: "pony",
              animalAge: 34,
              peltColor: "white",
            });
          }
          break;
        case "response-item2:12930812@barnyard.example.com":
          {
            count++;
            expect(response.status).toBe(200);
            expect(response.statusText).toBe("OK");
            expect(response.headers.get("Content-Type")).toContain(
              "application/json"
            );
            expect(response.json()).resolves.toEqual({
              kind: "farm#animal",
              etag: "etag/sheep",
              selfLink: "/farm/v1/animals/sheep",
              animalName: "sheep",
              animalAge: 5,
              peltColor: "green",
            });
          }
          break;
        case "response-item3:12930812@barnyard.example.com":
          {
            count++;
            expect(response.status).toBe(304);
            expect(response.statusText).toBe("Not Modified");
            expect(response.text()).resolves.toBe("");
          }
          break;
      }
    }
    expect(count).toBe(3);
  });
});
