const USER_ID = "60c72b2f9b1d8b2bad000001";

describe("03 - Card Creation & Management", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.fixture("cards.json").then((data) => {
      // The cards page loads the user's cards as soon as it opens
      cy.intercept("GET", "**/api/users/*/cards*", {
        statusCode: 200,
        body: data.mockCardList,
      }).as("loadCards");
    });
    cy.setSession({ id: USER_ID, firstName: "John", lastName: "Aedo", role: "shelter" });
    cy.visit("/cards");
    cy.wait("@loadCards");
  });

  it("should render all shelter listing form inputs", () => {
    cy.contains("h2", "Add a Shelter Dog").should("be.visible");

    cy.get("#cardText")
      .should("be.visible")
      .and("have.attr", "placeholder", "Dog Name");

    cy.get("#breed")
      .should("be.visible")
      .and("have.attr", "placeholder", "Breed");

    cy.get("#price")
      .should("be.visible")
      .and("have.attr", "placeholder", "0.00")
      .and("have.attr", "type", "number");

    cy.get("#location")
      .should("be.visible")
      .and("have.attr", "placeholder", "Location");

    cy.get("#description").should("be.visible");
    cy.get("#gender").should("be.visible").find("option").should("have.length", 4);
    cy.get("#intakeDate").should("be.visible").and("have.attr", "type", "date");
    cy.get("#size").should("be.visible").find("option").should("have.length", 4);

    cy.get("#addCardButton")
      .should("be.visible")
      .and("contain.text", "Add Dog");

    cy.get("#cardAddResult").should("have.class", "d-none");
  });

  it("should successfully add a new card and reset form inputs", () => {
    cy.fixture("cards.json").then((data) => {
      cy.intercept("POST", `**/api/users/${USER_ID}/cards`, {
        statusCode: 201,
        body: { _id: "card_99", ...data.newCard, userId: USER_ID },
      }).as("addCardRequest");

      cy.addCardByUI(data.newCard);

      cy.wait("@addCardRequest").then((interception) => {
        expect(interception.request.headers.authorization).to.eq("Bearer test-token");
        expect(interception.request.body).to.deep.equal(data.newCard);
      });

      // Verify success badge
      cy.get("#cardAddResult")
        .should("be.visible")
        .and("not.have.class", "d-none")
        .and("contain.text", "Dog has been added to the shelter listings");

      // Verify form fields were cleared
      cy.get("#cardText").should("have.value", "");
      cy.get("#breed").should("have.value", "");
      cy.get("#price").should("have.value", "");
      cy.get("#location").should("have.value", "");
      cy.get("#description").should("have.value", "");
      cy.get("#gender").should("have.value", "");
      cy.get("#intakeDate").should("have.value", "");
      cy.get("#size").should("have.value", "");

      // The new card joins the list (8 cards + 1)
      cy.contains("of 9 dog(s)").should("be.visible");
    });
  });

  it("should show the API's error when a card can't be added", () => {
    cy.intercept("POST", `**/api/users/${USER_ID}/cards`, {
      statusCode: 409,
      body: { error: "You already have a card with that name" },
    }).as("duplicate");

    cy.addCardByUI({ name: "Bugs Bunny" });
    cy.wait("@duplicate");

    cy.get("#cardAddResult")
      .should("be.visible")
      .and("contain.text", "You already have a card with that name");
  });

  it("should successfully delete a card", () => {
    cy.intercept("DELETE", "**/api/cards/card_01", { statusCode: 204 }).as("deleteCard");

    cy.get("#cardListContainer .card").first().within(() => {
      cy.get("button[aria-label='Delete Dog']").click();
    });

    cy.wait("@deleteCard");
    cy.get("#cardListContainer").should("not.contain", "Bugs Bunny");
    cy.get("#cardAddResult").should("contain.text", "Dog listing removed successfully");
  });

  it("should successfully edit a card", () => {
    cy.intercept("PATCH", "**/api/cards/card_01", {
      statusCode: 200,
      body: {
        _id: "card_01",
        name: "Bugs Bunny (Updated)",
        breed: "Tune Squad",
        price: 15000,
        location: "Warner Collectibles",
        userId: USER_ID,
      },
    }).as("updateCard");

    cy.get("#cardListContainer .card").first().within(() => {
      cy.get("button[aria-label='Edit Bugs Bunny']").click();
    });

    // Clicking Edit loads the card into the form
    cy.contains("h2", "Edit Dog Listing").should("be.visible");
    cy.get("#cardText").should("have.value", "Bugs Bunny");
    cy.get("#cardText").clear().type("Bugs Bunny (Updated)");
    cy.get("#addCardButton").should("contain.text", "Update Listing").click();

    cy.wait("@updateCard")
      .its("request.body.name")
      .should("eq", "Bugs Bunny (Updated)");
    cy.get("#cardAddResult").should("contain.text", "Dog listing updated successfully!");
    cy.contains("h3", "Bugs Bunny (Updated)").should("be.visible");
    cy.contains("h2", "Add a Shelter Dog").should("be.visible");
  });

  it("should cancel an edit without saving", () => {
    cy.get("#cardListContainer .card").first().within(() => {
      cy.get("button[aria-label='Edit Bugs Bunny']").click();
    });

    cy.get("#cancelEditButton").click();
    cy.contains("h2", "Add a Shelter Dog").should("be.visible");
    cy.get("#cardText").should("have.value", "");
  });

  it("should not let adopter accounts manage dog listings", () => {
    cy.clearSession();
    cy.setSession({ id: USER_ID, role: "user" });
    cy.visit("/cards");
    cy.wait("@loadCards");

    cy.contains("h2", "Shelter accounts only").should("be.visible");
    cy.get("#addCardButton").should("not.exist");
    cy.get("#cardListContainer button[aria-label='Delete Dog']").should("not.exist");
    cy.get("#cardListContainer button[aria-label='Edit Card']").should("not.exist");
  });
});
