from langgraph.graph import StateGraph, END
from typing import TypedDict, Optional
from roles.student import agent as student_agent
from roles.teacher import agent as teacher_agent
from roles.parent import agent as parent_agent
from roles.school import agent as school_agent
from roles.directorate import agent as directorate_agent
from roles.ministry import agent as ministry_agent
from roles.support import agent as support_agent


class AgentState(TypedDict):
    user_id: str
    role: str
    message: str
    response: str
    provider: Optional[str]
    model: Optional[str]
    support_ui: Optional[dict]
    chat_id: Optional[str]
    history: Optional[list]


def route(state: AgentState) -> str:
    routes = {
        "student": "student_node", "teacher": "teacher_node",
        "parent": "parent_node", "school": "school_node",
        "directorate": "directorate_node", "ministry": "ministry_node",
        "support": "support_node",
    }
    return routes.get(state.get("role", "student"), "student_node")


def student_node(state: AgentState) -> AgentState:
    state["response"] = student_agent.run(
        state["user_id"], state["message"], state.get("provider"), state.get("model"),
        history=state.get("history"), chat_id=state.get("chat_id"),
    )
    return state

def teacher_node(state: AgentState) -> AgentState:
    state["response"] = teacher_agent.run(state["user_id"], state["message"], state.get("provider"), state.get("model"), history=state.get("history"))
    return state

def parent_node(state: AgentState) -> AgentState:
    state["response"] = parent_agent.run(state["user_id"], state["message"], state.get("provider"), state.get("model"), history=state.get("history"))
    return state

def school_node(state: AgentState) -> AgentState:
    state["response"] = school_agent.run(state["user_id"], state["message"], state.get("provider"), state.get("model"), history=state.get("history"))
    return state

def directorate_node(state: AgentState) -> AgentState:
    state["response"] = directorate_agent.run(state["user_id"], state["message"], state.get("provider"), state.get("model"))
    return state

def ministry_node(state: AgentState) -> AgentState:
    state["response"] = ministry_agent.run(state["user_id"], state["message"], state.get("provider"), state.get("model"))
    return state

def support_node(state: AgentState) -> AgentState:
    payload = support_agent.run(
        state["message"],
        chat_id=state.get("chat_id"),
        provider=state.get("provider"),
        model=state.get("model"),
    )
    state["response"] = payload["response"]
    state["support_ui"] = payload.get("support_ui")
    return state


def build_graph():
    graph = StateGraph(AgentState)
    graph.add_node("student_node", student_node)
    graph.add_node("teacher_node", teacher_node)
    graph.add_node("parent_node", parent_node)
    graph.add_node("school_node", school_node)
    graph.add_node("directorate_node", directorate_node)
    graph.add_node("ministry_node", ministry_node)
    graph.add_node("support_node", support_node)
    graph.set_conditional_entry_point(route)
    for node in ["student_node", "teacher_node", "parent_node", "school_node", "directorate_node", "ministry_node", "support_node"]:
        graph.add_edge(node, END)
    return graph.compile()


app_graph = build_graph()


def run_agent(user_id: str, role: str, message: str, provider: str = None, model: str = None, chat_id: str = None, history: list | None = None) -> dict:
    result = app_graph.invoke({
        "user_id": user_id, "role": role, "message": message,
        "response": "", "provider": provider, "model": model,
        "support_ui": None, "chat_id": chat_id, "history": history,
    })
    return {
        "response": result["response"],
        "support_ui": result.get("support_ui"),
    }
