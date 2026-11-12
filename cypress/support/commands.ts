export interface UserSession {
  token: string;
  id: string;
  firstName: string;
  lastName: string;
}

export interface NewUserData {
  firstName?: string;
  lastName?: string;
  login: string;
  email?: string;
  password: string;
}

export interface NewCardData {
  name: string;
  breed?: string;
  price?: number | string;
  location?: string;
}

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Log in through the UI form
       */
      loginByUI(username: string, password: string): Chainable<void>;

      /**
       * Register a new user through the UI form
       */
      registerByUI(userData: NewUserData): Chainable<void>;

      /**
       * Set the user session (token and user) directly in localStorage,
       * as if the user had logged in
       */
      setSession(session?: Partial<UserSession>): Chainable<void>;

      /**
       * Clear current session from localStorage
       */
      clearSession(): Chainable<void>;

      /**
       * Add a new card through the CardUI form
       */
      addCardByUI(card: NewCardData): Chainable<void>;

      /**
       * Search cards through the CardUI search input
       */
      searchCardByUI(query?: string): Chainable<void>;

      /**
       * Click the logout button in LoggedInName component
       */
      logoutByUI(): Chainable<void>;
    }
  }
}

Cypress.Commands.add("loginByUI", (username: string, password: string) => {
  cy.get("#loginName").should("be.visible").clear().type(username);
  cy.get("#loginPassword").should("be.visible").clear().type(password);
  cy.get("#loginButton").should("be.visible").click();
});

Cypress.Commands.add("registerByUI", (userData: NewUserData) => {
  cy.get("#toggleRegisterButton").should("be.visible").click();
  if (userData.firstName) {
    cy.get("#regFirstName").clear().type(userData.firstName);
  }
  if (userData.lastName) {
    cy.get("#regLastName").clear().type(userData.lastName);
  }
  cy.get("#regLoginName").clear().type(userData.login);
  if (userData.email) {
    cy.get("#regEmail").clear().type(userData.email);
  }
  cy.get("#regPassword").clear().type(userData.password);
  cy.get("#registerButton").should("be.visible").click();
});

Cypress.Commands.add("setSession", (session?: Partial<UserSession>) => {
  const defaultSession: UserSession = {
    token: "test-token",
    id: "60c72b2f9b1d8b2bad000001",
    firstName: "John",
    lastName: "Aedo",
  };
  const finalSession = { ...defaultSession, ...session };
  window.localStorage.setItem("user_data", JSON.stringify(finalSession));
});

Cypress.Commands.add("clearSession", () => {
  window.localStorage.removeItem("user_data");
});

Cypress.Commands.add("addCardByUI", (card: NewCardData) => {
  cy.get("#cardText").clear().type(card.name);
  if (card.breed !== undefined) {
    cy.get("#breed").clear().type(card.breed);
  }
  if (card.price !== undefined) {
    cy.get("#price").clear().type(card.price.toString());
  }
  if (card.location !== undefined) {
    cy.get("#location").clear().type(card.location);
  }
  cy.get("#addCardButton").should("be.visible").click();
});

Cypress.Commands.add("searchCardByUI", (query = "") => {
  if (query) {
    cy.get("#searchText").clear().type(query);
  } else {
    cy.get("#searchText").clear();
  }
  cy.get("#searchCardButton").should("be.visible").click();
});

Cypress.Commands.add("logoutByUI", () => {
  cy.get("#logoutButton").should("be.visible").click();
});
