import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { apiFetch } from "../utils/api";
import { getSession } from "../utils/session";
import CardList, { type CardData } from "./CardList";

type Feedback = { text: string; isError: boolean } | null;

type CardsResult = { cards: CardData[]; feedback: string };

// Asks the API for a user's cards, optionally filtered by a search term.
// Returns the cards plus a message for the page; it never throws.
async function fetchCards(cardsRoute: string, term = ""): Promise<CardsResult> {
  try {
    const query = term.trim() ? `?search=${encodeURIComponent(term.trim())}` : "";
    const res = await apiFetch<CardData[]>(`${cardsRoute}${query}`);

    return res.ok
      ? { cards: res.data, feedback: `${res.data.length} card(s) found` }
      : { cards: [], feedback: "API Error: " + res.error };
  } catch (error: unknown) {
    return { cards: [], feedback: (error as Error).toString() };
  }
}

function CardUI() {
  // RequireLogin in App.tsx guarantees there is a session on this page.
  // Read it once: if the API rejects the token, the session is cleared while
  // the page is still on screen, and later renders must not depend on it.
  const [session] = useState(() => getSession()!);
  const cardsRoute = `api/users/${session.id}/cards`;

  const [cards, setCards] = useState<CardData[]>([]);
  const [search, setSearch] = useState("");
  const [searchFeedback, setSearchFeedback] = useState("");
  // True while cards are loading, starting with the first load below
  const [isSearching, setIsSearching] = useState(true);

  // Add/Edit form state
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [editingCard, setEditingCard] = useState<CardData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formFeedback, setFormFeedback] = useState<Feedback>(null);

  // Puts a fetchCards() result on the page
  function showCards(result: CardsResult): void {
    setCards(result.cards);
    setSearchFeedback(result.feedback);
    setIsSearching(false);
  }

  // Show the user's whole collection when the page first opens. The effect
  // only starts the request; the page updates when the answer arrives.
  useEffect(() => {
    fetchCards(cardsRoute).then((result) => {
      setCards(result.cards);
      setSearchFeedback(result.feedback);
      setIsSearching(false);
    });
  }, [cardsRoute]);

  function resetForm(): void {
    setEditingCard(null);
    setName("");
    setBreed("");
    setAge("");
    setPrice("");
    setLocation("");
  }

  function startEditing(card: CardData): void {
    setEditingCard(card);
    setName(card.name ?? "");
    setBreed(card.breed ?? "");
    setAge(card.age?.toString() ?? "");
    setPrice(card.price?.toString() ?? "");
    setLocation(card.location ?? "");
    setFormFeedback(null);
  }

  async function handleSearch(e: FormEvent): Promise<void> {
    e.preventDefault();
    setIsSearching(true);
    showCards(await fetchCards(cardsRoute, search));
  }

  // Adds a new card, or saves changes to the card being edited
  async function handleSave(e: FormEvent): Promise<void> {
    e.preventDefault();
    setIsSaving(true);
    setFormFeedback(null);

    // Field names match the Dog model in the backend (models/Dog.js)
    const fields: Record<string, string | number> = {
      name,
      breed,
      price: price ? parseFloat(price) : 0,
      location,
    };
    if (age) fields.age = parseFloat(age);

    try {
      const res = editingCard
        ? await apiFetch<CardData>(`api/cards/${editingCard._id}`, { method: "PATCH", body: fields })
        : await apiFetch<CardData>(cardsRoute, { method: "POST", body: fields });

      if (!res.ok) {
        setFormFeedback({ text: "API Error: " + res.error, isError: true });
        return;
      }

      if (editingCard) {
        // Swap the old version of the card for the updated one
        setCards((current) => current.map((c) => (c._id === res.data._id ? res.data : c)));
        setFormFeedback({ text: "Card updated successfully!", isError: false });
      } else {
        setCards((current) => [...current, res.data]);
        setFormFeedback({ text: "Card has been added", isError: false });
      }
      resetForm();
    } catch (error: unknown) {
      setFormFeedback({ text: (error as Error).toString(), isError: true });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string): Promise<void> {
    if (!window.confirm("Are you sure you want to delete this card?")) return;

    try {
      const res = await apiFetch<null>(`api/cards/${id}`, { method: "DELETE" });

      if (!res.ok) {
        setFormFeedback({ text: "API Error: " + res.error, isError: true });
        return;
      }

      setCards((current) => current.filter((c) => c._id !== id));
      if (editingCard?._id === id) resetForm();
      setFormFeedback({ text: "Card deleted successfully", isError: false });
    } catch (error: unknown) {
      setFormFeedback({ text: (error as Error).toString(), isError: true });
    }
  }

  return (
    <main id="cardUIDiv" className="w-100">
      <div className="card shadow-sm border-0 rounded-4 p-4 p-md-5 bg-white mb-4">
        <div className="d-flex align-items-center gap-3 mb-4 border-bottom pb-3">
          <div className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: "52px", height: "52px" }}>
            <i className="bi bi-credit-card-2-front-fill fs-3" aria-hidden="true"></i>
          </div>
          <div className="ms-2">
            <h1 className="h3 fw-bold text-body-emphasis mb-1">Welcome {session.firstName} {session.lastName}</h1>
            <p className="text-secondary small mb-0">Manage and search your collection of cards efficiently.</p>
          </div>
        </div>

        <div className="row g-4">
          {/* Search and results */}
          <div className="col-12 col-lg-6">
            <div className="card h-100 border-0 bg-light-subtle shadow-sm rounded-3 p-4">
              <h2 className="h5 fw-bold text-body-emphasis mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-search text-primary" aria-hidden="true"></i>
                Search Cards
              </h2>
              <form onSubmit={handleSearch}>
                <div className="mb-3">
                  <label htmlFor="searchText" className="form-label fw-semibold">Search Keyword</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white"><i className="bi bi-search text-secondary" aria-hidden="true"></i></span>
                    <input
                      type="text"
                      className="form-control"
                      id="searchText"
                      placeholder="Search name, breed, location, age, or price"
                      value={search}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                    />
                    <button type="submit" id="searchCardButton" className="btn btn-primary px-3 fw-semibold d-flex align-items-center gap-2" disabled={isSearching}>
                      {isSearching
                        ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        : <i className="bi bi-search" aria-hidden="true"></i>}
                      <span>Search Card</span>
                    </button>
                  </div>
                </div>
              </form>
              <div className="mt-3">
                <span
                  id="cardSearchResult"
                  className={searchFeedback ? "badge bg-primary-subtle text-primary-emphasis fw-semibold p-2 d-inline-block mb-3 fs-6" : "d-none"}
                  role={searchFeedback ? "status" : undefined}
                  aria-live="polite"
                >
                  {searchFeedback}
                </span>
                <CardList cards={cards} onDelete={handleDelete} onEdit={startEditing} />
              </div>
            </div>
          </div>

          {/* Add / edit form */}
          <div className="col-12 col-lg-6">
            <div className="card h-100 border-0 bg-light-subtle shadow-sm rounded-3 p-4">
              <h2 className="h5 fw-bold text-body-emphasis mb-3 d-flex align-items-center gap-2">
                <i className={editingCard ? "bi bi-pencil-square text-warning" : "bi bi-plus-circle-fill text-success"} aria-hidden="true"></i>
                {editingCard ? "Edit Card" : "Add New Card"}
              </h2>
              <form onSubmit={handleSave}>
                <div className="row g-3 mb-3">
                  <div className="col-12 col-sm-6">
                    <label htmlFor="cardText" className="form-label fw-semibold">Dog Name</label>
                    <input type="text" className="form-control" id="cardText" placeholder="Dog Name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="col-12 col-sm-6">
                    <label htmlFor="breed" className="form-label fw-semibold">Breed</label>
                    <input type="text" className="form-control" id="breed" placeholder="Breed" value={breed} onChange={(e) => setBreed(e.target.value)} />
                  </div>
                  <div className="col-12 col-sm-6">
                    <label htmlFor="age" className="form-label fw-semibold">Age (years)</label>
                    <input type="number" min="0" step="1" className="form-control" id="age" placeholder="0" value={age} onChange={(e) => setAge(e.target.value)} />
                  </div>
                  <div className="col-12 col-sm-6">
                    <label htmlFor="price" className="form-label fw-semibold">Adoption Fee ($)</label>
                    <input type="number" min="0" step="0.01" className="form-control" id="price" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
                  </div>
                  <div className="col-12">
                    <label htmlFor="location" className="form-label fw-semibold">Location</label>
                    <input type="text" className="form-control" id="location" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
                  </div>
                </div>
                <button type="submit" id="addCardButton" className="btn btn-primary px-4 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 w-100" disabled={isSaving}>
                  {isSaving
                    ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    : <i className="bi bi-save" aria-hidden="true"></i>}
                  <span>{editingCard ? "Update Card" : "Add Card"}</span>
                </button>
                {editingCard && (
                  <button type="button" id="cancelEditButton" className="btn btn-link w-100 mt-2 text-secondary" onClick={resetForm}>Cancel Edit</button>
                )}
              </form>
              <div className="mt-3">
                <span
                  id="cardAddResult"
                  className={formFeedback
                    ? `badge ${formFeedback.isError ? "bg-danger-subtle text-danger-emphasis" : "bg-success-subtle text-success-emphasis"} fw-semibold p-2 d-inline-block fs-6`
                    : "d-none"}
                  role={formFeedback ? "status" : undefined}
                  aria-live="polite"
                >
                  {formFeedback?.text}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default CardUI;
